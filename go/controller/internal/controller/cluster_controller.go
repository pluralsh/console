package controller

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/cache"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const (
	ClusterFinalizer = "deployments.plural.sh/cluster-protection"
)

// ClusterReconciler reconciles a Cluster object.
type ClusterReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	UserGroupCache   cache.UserGroupCache
	CredentialsCache credentials.NamespaceCredentialsCache
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                     // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.ClusterList))). // Reconcile objects on credentials change.
		For(&v1alpha1.Cluster{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clusters,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clusters/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clusters/finalizers,verbs=update

func (r *ClusterReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	// Read resource from Kubernetes cluster.
	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, req.NamespacedName, cluster); err != nil {
		logger.Error(err, "Unable to fetch cluster")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	// Ensure that status updates will always be persisted when exiting this function.
	scope, err := NewDefaultScope(ctx, r.Client, cluster)
	if err != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := r.ConsoleClient.UseCredentials(req.Namespace, r.CredentialsCache)
	credentials.SyncCredentialsInfo(cluster, cluster.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Handle resource deletion both in Kubernetes cluster and in Console API.
	if result := r.addOrRemoveFinalizer(cluster); result != nil {
		return *result, nil
	}

	// Handle existing resource.
	exists, err := r.isExisting(cluster)
	if err != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, fmt.Errorf("could not check if cluster is existing resource, got error: %+v", err)
	}
	if exists {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return r.handleExisting(cluster)
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get Provider ID from the reference if it is set and ensure that controller reference is set properly.
	providerId, result, err := r.getProviderIdAndSetControllerRef(ctx, cluster)
	if result != nil || err != nil {
		return handleRequeue(result, err, cluster.SetCondition)
	}

	// Get Project from the reference if it is set and ensure that controller reference is set properly.
	project, res, err := GetProject(ctx, r.Client, r.Scheme, cluster)
	if res != nil || err != nil {
		return handleRequeue(res, err, cluster.SetCondition)
	}

	// Calculate SHA to detect changes that should be applied in the Console API.
	sha, err := utils.HashObject(cluster.UpdateAttributes())
	if err != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync resource with Console API.
	apiCluster, err := r.sync(ctx, cluster, providerId, project.Status.ID, sha)
	if err != nil {
		return handleRequeue(nil, err, cluster.SetCondition)
	}

	// Update resource status.
	cluster.Status.ID = &apiCluster.ID
	cluster.Status.KasURL = apiCluster.KasURL
	cluster.Status.CurrentVersion = apiCluster.CurrentVersion
	cluster.Status.PingedAt = apiCluster.PingedAt
	cluster.Status.SHA = &sha
	if apiCluster.Status != nil {
		for _, condition := range apiCluster.Status.Conditions {
			utils.SyncCondition(cluster.SetCondition, condition.Type, condition.Status, condition.Reason, condition.Message)
		}
	}
	utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	return jitterRequeue(requeueDefault), nil
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
		if cluster.Spec.ProviderRef == nil {
			return true, nil
		}
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return !cluster.Status.HasID(), nil
}

func (r *ClusterReconciler) handleExisting(cluster *v1alpha1.Cluster) (ctrl.Result, error) {
	apiCluster, err := r.ConsoleClient.GetClusterByHandle(cluster.Spec.Handle)
	if errors.IsNotFound(err) {
		cluster.Status.ID = nil
		utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, "Could not find Cluster in Console API")
		return jitterRequeue(requeueDefault), nil
	}
	if err != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return jitterRequeue(requeueDefault), err
	}
	if err := r.ensure(cluster); err != nil {
		return handleRequeue(nil, err, cluster.SetCondition)
	}
	// Calculate SHA to detect changes that should be applied in the Console API.
	sha, err := utils.HashObject(cluster.ReadOnlyUpdateAttributes())
	if err != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if !cluster.Status.IsSHAEqual(sha) {
		if _, err := r.ConsoleClient.UpdateCluster(apiCluster.ID, cluster.ReadOnlyUpdateAttributes()); err != nil {
			return ctrl.Result{}, err
		}
	}
	cluster.Status.SHA = &sha
	cluster.Status.ID = &apiCluster.ID
	cluster.Status.KasURL = apiCluster.KasURL
	cluster.Status.CurrentVersion = apiCluster.CurrentVersion
	cluster.Status.PingedAt = apiCluster.PingedAt
	if apiCluster.Status != nil {
		for _, condition := range apiCluster.Status.Conditions {
			utils.SyncCondition(cluster.SetCondition, condition.Type, condition.Status, condition.Reason, condition.Message)
		}
	}
	utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	return jitterRequeue(requeueDefault), nil
}

func (r *ClusterReconciler) addOrRemoveFinalizer(cluster *v1alpha1.Cluster) *ctrl.Result {
	/// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if cluster.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(cluster, ClusterFinalizer) {
		controllerutil.AddFinalizer(cluster, ClusterFinalizer)
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !cluster.DeletionTimestamp.IsZero() {
		if !cluster.Status.HasID() {
			controllerutil.RemoveFinalizer(cluster, ClusterFinalizer)
			return &ctrl.Result{}
		}

		// If object is already being deleted from Console API requeue.
		if r.ConsoleClient.IsClusterDeleting(cluster.Status.ID) {
			return lo.ToPtr(jitterRequeue(requeueDefault))
		}

		exists, err := r.ConsoleClient.IsClusterExisting(cluster.Status.ID)
		if err != nil {
			return lo.ToPtr(jitterRequeue(requeueDefault))
		}

		// Remove Cluster from Console API if it exists and is not read-only.
		if exists && !cluster.Status.IsReadonly() {
			if _, err := r.ConsoleClient.DeleteCluster(*cluster.Status.ID); err != nil {
				// If it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}
			}

			// If deletion process started requeue so that we can make sure provider
			// has been deleted from Console API before removing the finalizer.
			return lo.ToPtr(jitterRequeue(requeueDefault))
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(cluster, ClusterFinalizer)

		// Stop reconciliation as the item is being deleted.
		return &ctrl.Result{}
	}

	return nil
}

func (r *ClusterReconciler) getProviderIdAndSetControllerRef(ctx context.Context, cluster *v1alpha1.Cluster) (providerId *string, result *ctrl.Result, err error) {
	logger := log.FromContext(ctx)

	if cluster.Spec.IsProviderRefRequired() {
		if !cluster.Spec.HasProviderRef() {
			return nil, nil, fmt.Errorf("could not get provider, reference is not set but required")
		}

		provider := &v1alpha1.Provider{}
		if err := r.Get(ctx, types.NamespacedName{Name: cluster.Spec.ProviderRef.Name}, provider); err != nil {
			return nil, nil, fmt.Errorf("could not get provider, got error: %+v", err)
		}

		// Once provider is marked with deletion timestamp we should delete cluster as well.
		// Provider cannot be deleted until cluster exists so that ensures cascading deletion.
		if !provider.DeletionTimestamp.IsZero() {
			logger.Info(fmt.Sprintf("Provider is being deleted, deleting %s cluster as well", cluster.Name))
			err := r.Delete(ctx, cluster)
			if err != nil {
				return nil, nil, fmt.Errorf("could not delete %s cluster, got error: %+v", cluster.Name, err)
			}

			return nil, lo.ToPtr(jitterRequeue(requeueDefault)), nil
		}

		if !provider.Status.HasID() {
			return nil, &waitForResources, fmt.Errorf("provider does not have ID set yet")
		}

		err := controllerutil.SetOwnerReference(provider, cluster, r.Scheme)
		if err != nil {
			return nil, nil, fmt.Errorf("could not set cluster owner reference, got error: %+v", err)
		}

		return provider.Status.ID, nil, nil
	}

	return nil, nil, nil
}

func (r *ClusterReconciler) sync(ctx context.Context, cluster *v1alpha1.Cluster, providerId, projectId *string, sha string) (*console.ClusterFragment, error) {
	logger := log.FromContext(ctx)
	exists, err := r.ConsoleClient.IsClusterExisting(cluster.Status.ID)
	if err != nil {
		return nil, err
	}

	if err := r.ensure(cluster); err != nil {
		return nil, err
	}

	if !cluster.Status.IsSHAEqual(sha) && exists {
		logger.Info(fmt.Sprintf("Detected changes, updating %s cluster", cluster.Name))
		return r.ConsoleClient.UpdateCluster(*cluster.Status.ID, cluster.UpdateAttributes())
	}

	if exists {
		logger.V(9).Info(fmt.Sprintf("No changes detected for %s cluster", cluster.Name))
		return r.ConsoleClient.GetCluster(cluster.Status.ID)
	}

	logger.Info(fmt.Sprintf("%s cluster does not exist, creating it", cluster.Name))
	return r.ConsoleClient.CreateCluster(cluster.Attributes(providerId, projectId))
}

// ensure makes sure that user-friendly input such as userEmail/groupName in
// bindings are transformed into valid IDs on the v1alpha1.Binding object before creation
func (r *ClusterReconciler) ensure(cluster *v1alpha1.Cluster) error {
	if cluster.Spec.Bindings == nil {
		return nil
	}

	bindings, err := ensureBindings(cluster.Spec.Bindings.Read, r.UserGroupCache)
	if err != nil {
		return err
	}

	cluster.Spec.Bindings.Read = bindings

	bindings, err = ensureBindings(cluster.Spec.Bindings.Write, r.UserGroupCache)
	if err != nil {
		return err
	}

	cluster.Spec.Bindings.Write = bindings

	return nil
}
