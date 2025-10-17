package controller

import (
	"context"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
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
		return handleRequeue(nil, err, cluster.SetCondition)
	}

	exists, err := r.isExisting(cluster)
	if err != nil {
		return handleRequeue(nil, err, cluster.SetCondition)
	}
	if !exists {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, "cluster not found")
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
		return cluster.Spec.Reconciliation.Requeue(), nil
	}
	if err != nil {
		utils.MarkCondition(cluster.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return cluster.Spec.Reconciliation.Requeue(), err
	}

	// Calculate SHA to detect changes that should be applied in the Console API.
	attrs, err := r.Attributes(cluster)
	if err != nil {
		return handleRequeue(nil, err, cluster.SetCondition)
	}

	sha, err := utils.HashObject(*attrs)
	if err != nil {
		return handleRequeue(nil, err, cluster.SetCondition)
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

	return cluster.Spec.Reconciliation.Requeue(), nil
}

func (r *ClusterReconciler) Attributes(cluster *v1alpha1.Cluster) (*console.ClusterUpdateAttributes, error) {
	tagAttributes := cluster.TagUpdateAttributes()

	var readBindings, writeBindings []*console.PolicyBindingAttributes
	var err error
	if cluster.Spec.Bindings != nil {
		readBindings, err = bindingsAttributes(cluster.Spec.Bindings.Read)
		if err != nil {
			return nil, err
		}

		writeBindings, err = bindingsAttributes(cluster.Spec.Bindings.Write)
		if err != nil {
			return nil, err
		}
	}

	return &console.ClusterUpdateAttributes{
		Handle:        cluster.Spec.Handle,
		Tags:          tagAttributes.Tags,
		Metadata:      tagAttributes.Metadata,
		ReadBindings:  readBindings,
		WriteBindings: writeBindings,
	}, nil
}
