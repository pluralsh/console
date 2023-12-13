package cluster_controller

import (
	"context"
	"fmt"
	"time"

	"github.com/go-logr/logr"
	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"
	"github.com/pluralsh/console/controller/pkg/errors"
	"github.com/pluralsh/console/controller/pkg/utils"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const (
	RequeueAfter  = 30 * time.Second
	FinalizerName = "deployments.plural.sh/cluster-protection"
)

var (
	requeue = ctrl.Result{RequeueAfter: RequeueAfter}
)

// Reconciler reconciles a Cluster object.
type Reconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Log           logr.Logger
	Scheme        *runtime.Scheme
}

// SetupWithManager sets up the controller with the Manager.
func (r *Reconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Cluster{}).
		Complete(r)
}

func (r *Reconciler) Reconcile(ctx context.Context, req reconcile.Request) (reconcile.Result, error) {
	logger := log.FromContext(ctx)

	// Read resource from Kubernetes cluster.
	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, req.NamespacedName, cluster); err != nil {
		logger.Error(err, "Unable to fetch cluster")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Handle existing resource.
	existing, err := r.isExistingResource(cluster)
	if err != nil {
		return ctrl.Result{}, fmt.Errorf("could not check if cluster is existing resource, got error: %+v", err)
	}
	if existing {
		logger.Info("Cluster already exists in the API, running in read-only mode")
		return r.handleExistingResource(ctx, cluster)
	}

	// Handle resource deletion both in Kubernetes cluster and in Console API.
	result, err := r.addOrRemoveFinalizer(ctx, cluster)
	if result != nil {
		return *result, err
	}

	// Get Provider ID from the reference if it is set and ensure that owner reference is set properly.
	providerId, result, err := r.getProviderIdAndSetOwnerRef(ctx, cluster)
	if result != nil {
		return *result, err
	}

	// Calculate SHA to detect changes that should be applied in the Console API.
	sha, err := utils.HashObject(cluster.UpdateAttributes())
	if err != nil {
		return ctrl.Result{}, err
	}

	// Sync resource with Console API.
	apiCluster, err := r.syncCluster(ctx, cluster, providerId, &sha)
	if err != nil {
		return ctrl.Result{}, err
	}

	// Update resource status.
	if err = utils.TryUpdateStatus[*v1alpha1.Cluster](ctx, r.Client, cluster, func(c *v1alpha1.Cluster, original *v1alpha1.Cluster) (any, any) {
		c.Status.ID = &apiCluster.ID
		c.Status.KasURL = apiCluster.KasURL
		c.Status.CurrentVersion = apiCluster.CurrentVersion
		c.Status.PingedAt = apiCluster.PingedAt
		c.Status.SHA = &sha
		c.Status.Existing = lo.ToPtr(false)

		return original.Status, c.Status
	}); err != nil {
		return ctrl.Result{}, err
	}

	return requeue, nil
}

func (r *Reconciler) isExistingResource(cluster *v1alpha1.Cluster) (bool, error) {
	if cluster.Status.IsExisting() {
		return true, nil
	}

	if !cluster.Spec.HasHandle() {
		return false, nil
	}

	_, err := r.ConsoleClient.GetClusterByHandle(cluster.Spec.Handle)
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return !cluster.Status.HasID(), nil
}

func (r *Reconciler) handleExistingResource(ctx context.Context, cluster *v1alpha1.Cluster) (ctrl.Result, error) {
	apiCluster, err := r.ConsoleClient.GetClusterByHandle(cluster.Spec.Handle)
	if err != nil {
		return ctrl.Result{}, err
	}

	if err = utils.TryUpdateStatus[*v1alpha1.Cluster](ctx, r.Client, cluster, func(c *v1alpha1.Cluster, original *v1alpha1.Cluster) (any, any) {
		c.Status.ID = &apiCluster.ID
		c.Status.KasURL = apiCluster.KasURL
		c.Status.CurrentVersion = apiCluster.CurrentVersion
		c.Status.PingedAt = apiCluster.PingedAt
		c.Status.Existing = lo.ToPtr(true)

		return original.Status, c.Status
	}); err != nil {
		return ctrl.Result{}, err
	}

	return requeue, nil
}

func (r *Reconciler) addOrRemoveFinalizer(ctx context.Context, cluster *v1alpha1.Cluster) (*ctrl.Result, error) {
	// If object is not being deleted, so if it does not have our finalizer, then lets add the finalizer
	// and update the object. This is equivalent to registering our finalizer.
	if cluster.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(cluster, FinalizerName) {
		controllerutil.AddFinalizer(cluster, FinalizerName)
		if err := r.Update(ctx, cluster); err != nil {
			return &ctrl.Result{}, err
		}
	}

	// If object is being deleted.
	if !cluster.ObjectMeta.DeletionTimestamp.IsZero() {
		// If object is already being deleted from Console API requeue.
		if r.ConsoleClient.IsClusterDeleting(cluster.Status.ID) {
			return &requeue, nil
		}

		// Remove Cluster from Console API if it exists.
		if r.ConsoleClient.IsClusterExisting(cluster.Status.ID) {
			if _, err := r.ConsoleClient.DeleteCluster(*cluster.Status.ID); err != nil {
				// if fail to delete the external dependency here, return with error
				// so that it can be retried.
				return &ctrl.Result{}, err
			}
		}

		// If our finalizer is present, remove it.
		if controllerutil.ContainsFinalizer(cluster, FinalizerName) {
			controllerutil.RemoveFinalizer(cluster, FinalizerName)
			if err := r.Update(ctx, cluster); err != nil {
				return &ctrl.Result{}, err
			}
		}

		// Stop reconciliation as the item is being deleted.
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (r *Reconciler) getProviderIdAndSetOwnerRef(ctx context.Context, cluster *v1alpha1.Cluster) (providerId *string, result *ctrl.Result, err error) {
	logger := log.FromContext(ctx)

	if cluster.Spec.IsProviderRefRequired() {
		if !cluster.Spec.HasProviderRef() {
			return nil, &ctrl.Result{}, fmt.Errorf("could not get provider, reference is not set but required")
		}

		provider := &v1alpha1.Provider{}
		if err := r.Get(ctx, types.NamespacedName{Name: cluster.Spec.ProviderRef.Name}, provider); err != nil {
			return nil, &ctrl.Result{}, fmt.Errorf("could not get provider, got error: %+v", err)
		}

		if !provider.Status.HasID() {
			logger.Info("Provider does not have ID set yet")
			return nil, &requeue, nil
		}

		err = utils.TryAddOwnerRef(ctx, r.Client, provider, cluster, r.Scheme)
		if err != nil {
			return nil, &ctrl.Result{}, fmt.Errorf("could not set cluster owner reference, got error: %+v", err)
		}

		return provider.Status.ID, nil, nil
	}

	return nil, nil, nil
}

func (r *Reconciler) syncCluster(ctx context.Context, cluster *v1alpha1.Cluster, providerId *string, sha *string) (*console.ClusterFragment, error) {
	exists := r.ConsoleClient.IsClusterExisting(cluster.Status.ID)
	logger := log.FromContext(ctx)

	if cluster.Status.IsSHAChanged(sha) && exists {
		logger.Info("Detected changes, updating cluster")
		return r.ConsoleClient.UpdateCluster(*cluster.Status.ID, cluster.UpdateAttributes())
	}

	if exists {
		logger.Info("No changes detected, updating cluster")
		return r.ConsoleClient.GetCluster(cluster.Status.ID)
	}

	logger.Info("Cluster does not exist, creating new one")
	return r.ConsoleClient.CreateCluster(cluster.Attributes(providerId))
}
