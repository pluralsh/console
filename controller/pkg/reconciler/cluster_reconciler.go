package reconciler

import (
	"context"
	"fmt"

	"github.com/go-logr/logr"
	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"
	"github.com/pluralsh/console/controller/pkg/utils"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const (
	FinalizerName = "deployments.plural.sh/cluster-protection"
)

// ClusterReconciler reconciles a Cluster object.
type ClusterReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Log           logr.Logger
	Scheme        *runtime.Scheme
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Cluster{}).
		Complete(r)
}

func (r *ClusterReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	// Read resource from Kubernetes cluster.
	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, req.NamespacedName, cluster); err != nil {
		logger.Error(err, "Unable to fetch cluster")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Ensure that status updates will always be persisted when exiting this function.
	scope, err := NewClusterScope(ctx, r.Client, cluster)
	if err != nil {
		logger.Error(err, "Failed to create cluster scope")
		utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Handle existing resource.
	existing, err := r.isExisting(cluster)
	if err != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, fmt.Errorf("could not check if cluster is existing resource, got error: %+v", err)
	}
	if existing {
		logger.V(9).Info("Cluster already exists in the API, running in read-only mode")
		return r.handleExisting(cluster)
	}

	// Handle resource deletion both in Kubernetes cluster and in Console API.
	if result := r.addOrRemoveFinalizer(cluster); result != nil {
		return *result, nil
	}

	// Get Provider ID from the reference if it is set and ensure that controller reference is set properly.
	providerId, result, err := r.getProviderIdAndSetControllerRef(ctx, cluster)
	if result != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return *result, err
	}

	// Calculate SHA to detect changes that should be applied in the Console API.
	sha, err := utils.HashObject(cluster.UpdateAttributes())
	if err != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Sync resource with Console API.
	apiCluster, err := r.sync(ctx, cluster, providerId, sha)
	if err != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Update resource status.
	cluster.Status.ID = &apiCluster.ID
	cluster.Status.KasURL = apiCluster.KasURL
	cluster.Status.CurrentVersion = apiCluster.CurrentVersion
	cluster.Status.PingedAt = apiCluster.PingedAt
	cluster.Status.SHA = &sha
	utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")
	utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

func (r *ClusterReconciler) isExisting(cluster *v1alpha1.Cluster) (bool, error) {
	if cluster.Status.HasReadonlyCondition() {
		return cluster.Status.IsReadonly(), nil
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

func (r *ClusterReconciler) handleExisting(cluster *v1alpha1.Cluster) (ctrl.Result, error) {
	apiCluster, err := r.ConsoleClient.GetClusterByHandle(cluster.Spec.Handle)
	if err != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	cluster.Status.ID = &apiCluster.ID
	cluster.Status.KasURL = apiCluster.KasURL
	cluster.Status.CurrentVersion = apiCluster.CurrentVersion
	cluster.Status.PingedAt = apiCluster.PingedAt
	utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
	utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

func (r *ClusterReconciler) addOrRemoveFinalizer(cluster *v1alpha1.Cluster) *ctrl.Result {
	/// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if cluster.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(cluster, FinalizerName) {
		controllerutil.AddFinalizer(cluster, FinalizerName)
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !cluster.ObjectMeta.DeletionTimestamp.IsZero() {
		// If object is already being deleted from Console API requeue.
		if r.ConsoleClient.IsClusterDeleting(cluster.Status.ID) {
			return &requeue
		}

		// Remove Cluster from Console API if it exists.
		if r.ConsoleClient.IsClusterExisting(cluster.Status.ID) {
			if _, err := r.ConsoleClient.DeleteCluster(*cluster.Status.ID); err != nil {
				// If it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
				return &ctrl.Result{}
			}

			// If deletion process started requeue so that we can make sure provider
			// has been deleted from Console API before removing the finalizer.
			return &requeue
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(cluster, FinalizerName)

		// Stop reconciliation as the item is being deleted.
		return &ctrl.Result{}
	}

	return nil
}

func (r *ClusterReconciler) getProviderIdAndSetControllerRef(ctx context.Context, cluster *v1alpha1.Cluster) (providerId *string, result *ctrl.Result, err error) {
	logger := log.FromContext(ctx)

	if cluster.Spec.IsProviderRefRequired() {
		if !cluster.Spec.HasProviderRef() {
			return nil, &ctrl.Result{}, fmt.Errorf("could not get provider, reference is not set but required")
		}

		provider := &v1alpha1.Provider{}
		if err := r.Get(ctx, types.NamespacedName{Name: cluster.Spec.ProviderRef.Name}, provider); err != nil {
			return nil, &ctrl.Result{}, fmt.Errorf("could not get provider, got error: %+v", err)
		}

		// Once provider is marked with deletion timestamp we should delete cluster as well.
		// Provider cannot be deleted until cluster exists so that ensures cascading deletion.
		if !provider.DeletionTimestamp.IsZero() {
			logger.Info(fmt.Sprintf("Provider is being deleted, deleting %s cluster as well", cluster.Name))
			err := r.Delete(ctx, cluster)
			if err != nil {
				return nil, &ctrl.Result{}, fmt.Errorf("could not delete %s cluster, got error: %+v", cluster.Name, err)
			}

			return nil, &requeue, nil
		}

		if !provider.Status.HasID() {
			logger.Info("Provider does not have ID set yet")
			return nil, &requeue, nil
		}

		err := controllerutil.SetOwnerReference(provider, cluster, r.Scheme)
		if err != nil {
			return nil, &ctrl.Result{}, fmt.Errorf("could not set cluster owner reference, got error: %+v", err)
		}

		return provider.Status.ID, nil, nil
	}

	return nil, nil, nil
}

func (r *ClusterReconciler) sync(ctx context.Context, cluster *v1alpha1.Cluster, providerId *string, sha string) (*console.ClusterFragment, error) {
	exists := r.ConsoleClient.IsClusterExisting(cluster.Status.ID)
	logger := log.FromContext(ctx)

	if cluster.Status.IsSHAChanged(sha) && exists {
		logger.Info(fmt.Sprintf("Detected changes, updating %s cluster", cluster.Name))
		return r.ConsoleClient.UpdateCluster(*cluster.Status.ID, cluster.UpdateAttributes())
	}

	if exists {
		logger.V(9).Info(fmt.Sprintf("No changes detected for %s cluster", cluster.Name))
		return r.ConsoleClient.GetCluster(cluster.Status.ID)
	}

	logger.Info(fmt.Sprintf("%s cluster does not exist, creating it", cluster.Name))
	return r.ConsoleClient.CreateCluster(cluster.Attributes(providerId))
}
