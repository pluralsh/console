package controller

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/controller/internal/credentials"
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

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// GroupReconciler reconciles a v1alpha1.Group object.
// Implements reconcile.Reconciler and types.Controller.
type GroupReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	CredentialsCache credentials.NamespaceCredentialsCache
	Scheme           *runtime.Scheme
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=groups,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=groups/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=groups/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.Group closer to the desired state
// and syncs it with the Console API state.
func (in *GroupReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	group := new(v1alpha1.Group)
	if err := in.Get(ctx, req.NamespacedName, group); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if !group.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	scope, err := common.NewDefaultScope(ctx, in.Client, group)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkCondition(group.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := in.ConsoleClient.UseCredentials(req.Namespace, in.CredentialsCache)
	credentials.SyncCredentialsInfo(group, group.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(group.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Check if resource already exists in the API and only sync the ID
	exists, err := in.isAlreadyExists(ctx, group)
	if err != nil {
		utils.MarkCondition(group.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists {
		utils.MarkCondition(group.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return in.handleExistingGroup(ctx, group)
	}

	// Mark the resource as managed by this operator.
	utils.MarkCondition(group.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get group SHA that can be saved back in the status to check for changes
	changed, sha, err := group.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate group SHA")
		utils.MarkCondition(group.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync group CRD with the Console API
	apiGroup, err := in.sync(ctx, group, changed)
	if err != nil {
		return common.HandleRequeue(nil, err, group.SetCondition)
	}

	group.Status.ID = &apiGroup.ID
	group.Status.SHA = &sha

	utils.MarkCondition(group.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(group.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return group.Spec.Reconciliation.Requeue(), nil
}

func (in *GroupReconciler) isAlreadyExists(ctx context.Context, group *v1alpha1.Group) (bool, error) {
	if group.Status.HasReadonlyCondition() {
		return group.Status.IsReadonly(), nil
	}

	_, err := in.ConsoleClient.GetGroup(group.ConsoleName())
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	if !group.Status.HasID() {
		log.FromContext(ctx).Info("group already exists in the API, running in read-only mode")
		return true, nil
	}

	return false, nil
}

func (in *GroupReconciler) handleExistingGroup(ctx context.Context, group *v1alpha1.Group) (ctrl.Result, error) {
	exists, err := in.ConsoleClient.IsGroupExists(group.ConsoleName())
	if err != nil {
		return common.HandleRequeue(nil, err, group.SetCondition)
	}

	if !exists {
		group.Status.ID = nil
		utils.MarkCondition(group.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return common.Wait(), nil
	}

	apiGroup, err := in.ConsoleClient.GetGroup(group.ConsoleName())
	if err != nil {
		return common.HandleRequeue(nil, err, group.SetCondition)
	}

	group.Status.ID = &apiGroup.ID

	utils.MarkCondition(group.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(group.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return group.Spec.Reconciliation.Requeue(), nil
}

func (in *GroupReconciler) sync(ctx context.Context, group *v1alpha1.Group, changed bool) (*console.GroupFragment, error) {
	logger := log.FromContext(ctx)
	exists, err := in.ConsoleClient.IsGroupExists(group.Status.GetID())
	if err != nil {
		return nil, err
	}

	// Update only if the group has changed.
	if changed && exists {
		logger.Info(fmt.Sprintf("updating group %s", group.ConsoleName()))
		return in.ConsoleClient.UpdateGroup(ctx, group.Status.GetID(), group.Attributes())
	}

	// Read the group from Console API if it already exists.
	if exists {
		return in.ConsoleClient.GetGroup(group.Status.GetID())
	}

	logger.Info(fmt.Sprintf("%s group does not exist, creating it", group.ConsoleName()))
	return in.ConsoleClient.CreateGroup(ctx, group.Attributes())
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (in *GroupReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("starting reconciler", "reconciler", "group_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.FlowList))).
		For(&v1alpha1.Group{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
