package cluster_controller

import (
	"context"
	"fmt"
	"reflect"
	"time"

	"github.com/go-logr/logr"
	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"
	"github.com/pluralsh/console/controller/pkg/errors"
	"github.com/pluralsh/console/controller/pkg/utils"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
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
	// Read cluster resource
	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, req.NamespacedName, cluster); err != nil {
		r.Log.Error(err, "unable to fetch cluster")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Handle cluster resource deletion
	result, err := r.addOrRemoveFinalizer(ctx, cluster)
	if result != nil {
		return *result, err
	}

	var apiCluster *console.ClusterFragment
	if cluster.Status.ID != nil {
		apiCluster, err = r.ConsoleClient.GetCluster(cluster.Status.ID)
		if err != nil && !errors.IsNotFound(err) {
			return ctrl.Result{}, err
		}
	}

	var providerId *string
	if cluster.Spec.Cloud != "byok" {
		provider, err := r.getProvider(ctx, cluster)
		if err != nil {
			return ctrl.Result{}, err
		}

		providerId = provider.Status.ID
		if providerId == nil {
			r.Log.Info("provider does not have ID set yet")
			return requeue, nil
		}

		err = utils.TryAddOwnerRef(ctx, r.Client, provider, cluster, r.Scheme)
		if err != nil {
			return ctrl.Result{}, err
		}
	}

	if apiCluster == nil {
		apiCluster, err = r.ConsoleClient.CreateCluster(cluster.Attributes(providerId))
		if err != nil {
			return ctrl.Result{}, err
		}
	}

	sha, err := utils.HashObject(cluster.UpdateAttributes())
	if err != nil {
		return ctrl.Result{}, err
	}
	if cluster.Status.ID != nil && cluster.Status.SHA != nil && cluster.Status.SHA != &sha {
		apiCluster, err = r.ConsoleClient.UpdateCluster(*cluster.Status.ID, cluster.UpdateAttributes())
		if err != nil {
			return ctrl.Result{}, err
		}
	}

	if err := r.updateStatus(ctx, cluster, func(r *v1alpha1.Cluster) {
		r.Status.ID = &apiCluster.ID
		r.Status.KasURL = apiCluster.KasURL
		r.Status.CurrentVersion = apiCluster.CurrentVersion
		r.Status.PingedAt = apiCluster.PingedAt
		r.Status.SHA = &sha
		// TODO: Conditions, i.e. readonly, exists.
	}); err != nil {
		return ctrl.Result{}, err
	}

	return requeue, nil
}

func (r *Reconciler) addOrRemoveFinalizer(ctx context.Context, cluster *v1alpha1.Cluster) (*ctrl.Result, error) {
	// If object is not being deleted, so if it does not have our finalizer,
	// then lets add the finalizer and update the object. This is equivalent
	// to registering our finalizer.
	if cluster.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(cluster, FinalizerName) {
		controllerutil.AddFinalizer(cluster, FinalizerName)
		if err := r.Update(ctx, cluster); err != nil {
			return &ctrl.Result{}, err
		}
	}

	// If object is being deleted
	if !cluster.ObjectMeta.DeletionTimestamp.IsZero() {
		// If object is already being deleted from Console API requeue
		if r.ConsoleClient.IsClusterDeleting(cluster.Status.ID) {
			return &requeue, nil
		}

		// Remove Cluster from Console API if it exists
		if r.ConsoleClient.IsClusterExisting(cluster.Status.ID) {
			if _, err := r.ConsoleClient.DeleteCluster(*cluster.Status.ID); err != nil {
				// if fail to delete the external dependency here, return with error
				// so that it can be retried.
				return &ctrl.Result{}, err
			}
		}

		// If our finalizer is present, remove it
		if controllerutil.ContainsFinalizer(cluster, FinalizerName) {
			controllerutil.RemoveFinalizer(cluster, FinalizerName)
			if err := r.Update(ctx, cluster); err != nil {
				return &ctrl.Result{}, err
			}
		}

		// Stop reconciliation as the item is being deleted
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (r *Reconciler) updateStatus(ctx context.Context, cluster *v1alpha1.Cluster, patch func(cluster *v1alpha1.Cluster)) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if err := r.Client.Get(ctx, ctrlruntimeclient.ObjectKeyFromObject(cluster), cluster); err != nil {
			return fmt.Errorf("could not fetch current cluster state, got error: %+v", err)
		}

		original := cluster.DeepCopy()

		patch(cluster)

		if reflect.DeepEqual(original.Status, cluster.Status) {
			return nil
		}

		return r.Client.Status().Patch(ctx, cluster, ctrlruntimeclient.MergeFrom(original))
	})
}

func (r *Reconciler) getProvider(ctx context.Context, cluster *v1alpha1.Cluster) (*v1alpha1.Provider, error) {
	if cluster.Spec.ProviderRef == nil {
		return nil, fmt.Errorf("could not get provider, reference is not set")
	}

	provider := &v1alpha1.Provider{}
	err := r.Get(ctx, types.NamespacedName{
		Name:      cluster.Spec.ProviderRef.Name,
		Namespace: cluster.Spec.ProviderRef.Namespace,
	}, provider)
	if err != nil {
		return nil, fmt.Errorf("could not get provider, got error: %+v", err)
	}

	return provider, nil
}
