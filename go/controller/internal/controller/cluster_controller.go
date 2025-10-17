package controller

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
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

	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, req.NamespacedName, cluster); err != nil {
		logger.Error(err, "Unable to fetch cluster")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

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

	utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

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

	exists, err := r.isExisting(cluster)
	if err != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, fmt.Errorf("could not check if cluster is existing resource, got error: %+v", err)
	}
	if !exists {
		err = fmt.Errorf("cluster not found")
		utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return wait(), nil
	}

	utils.MarkCondition(cluster.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
	return r.handleExisting(cluster)
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
		return requeue(), nil
	}
	if err != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return requeue(), err
	}

	// Calculate SHA to detect changes that should be applied in the Console API.
	attrs, err := r.Attributes(cluster)
	if err != nil {
		return handleRequeue(nil, err, cluster.SetCondition)
	}

	sha, err := utils.HashObject(*attrs)
	if err != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if !cluster.Status.IsSHAEqual(sha) {
		if _, err := r.ConsoleClient.UpdateCluster(apiCluster.ID, *attrs); err != nil {
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
	return requeue(), nil
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
			return lo.ToPtr(requeue())
		}

		exists, err := r.ConsoleClient.IsClusterExisting(cluster.Status.ID)
		if err != nil {
			return lo.ToPtr(requeue())
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
			return lo.ToPtr(requeue())
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(cluster, ClusterFinalizer)

		// Stop reconciliation as the item is being deleted.
		return &ctrl.Result{}
	}

	return nil
}

func (r *ClusterReconciler) Attributes(c *v1alpha1.Cluster) (*console.ClusterUpdateAttributes, error) {
	tagAttr := c.TagUpdateAttributes()

	attr := console.ClusterUpdateAttributes{
		Handle:   c.Spec.Handle,
		Tags:     tagAttr.Tags,
		Metadata: tagAttr.Metadata,
	}

	if c.Spec.Bindings != nil {
		var err error

		attr.ReadBindings, err = bindingsAttributes(c.Spec.Bindings.Read)
		if err != nil {
			return nil, err
		}

		attr.WriteBindings, err = bindingsAttributes(c.Spec.Bindings.Write)
		if err != nil {
			return nil, err
		}
	}

	return &attr, nil
}
