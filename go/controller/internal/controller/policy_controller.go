package controller

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/controller/internal/common"
	"sigs.k8s.io/controller-runtime/pkg/controller"

	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// PolicyReconciler reconciles a v1alpha1.Policy object.
// Implements reconcile.Reconciler and types.Controller.
type PolicyReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

const (
	// PolicyProtectionFinalizerName defines name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	PolicyProtectionFinalizerName = "policies.deployments.plural.sh/policy-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=policies,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=policies/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=policies/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.Policy closer to the desired state
// and syncs it with the Console API state.
func (in *PolicyReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	policy := new(v1alpha1.Policy)
	if err := in.Get(ctx, req.NamespacedName, policy); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, in.Client, policy)
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
	utils.MarkCondition(policy.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Check if resource already exists in the API and only sync the ID.
	exists, err := in.isAlreadyExists(ctx, policy)
	if err != nil {
		utils.MarkCondition(policy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists && !policy.Spec.Reconciliation.DriftDetect() {
		utils.MarkReadOnly(policy)
		return in.handleExistingPolicy(ctx, policy)
	}

	// Handle proper resource deletion via finalizer.
	result := in.addOrRemoveFinalizer(ctx, policy)
	if result != nil {
		return *result, nil
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(policy.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	// Get Policy SHA that can be saved back in the status to check for changes.
	changed, sha, err := policy.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate policy SHA")
		utils.MarkCondition(policy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync Policy CRD with the Console API.
	apiPolicy, err := in.sync(ctx, policy, changed)
	if err != nil {
		return common.HandleRequeue(nil, err, policy.SetCondition)
	}

	policy.Status.ID = &apiPolicy.ID
	policy.Status.SHA = &sha

	utils.MarkCondition(policy.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(policy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return policy.Spec.Reconciliation.Requeue(), nil
}

func (in *PolicyReconciler) addOrRemoveFinalizer(ctx context.Context, policy *v1alpha1.Policy) *ctrl.Result {
	if policy.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(policy, PolicyProtectionFinalizerName) {
		controllerutil.AddFinalizer(policy, PolicyProtectionFinalizerName)
	}

	if !policy.DeletionTimestamp.IsZero() {
		if !policy.Status.HasID() {
			controllerutil.RemoveFinalizer(policy, PolicyProtectionFinalizerName)
			return &ctrl.Result{}
		}

		exists, err := in.ConsoleClient.IsPolicyExists(ctx, policy.Status.ID, nil)
		if err != nil {
			return lo.ToPtr(policy.Spec.Reconciliation.Requeue())
		}

		if exists {
			if err = in.ConsoleClient.DeletePolicy(ctx, policy.Status.GetID()); err != nil {
				utils.MarkCondition(policy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return lo.ToPtr(common.Wait())
			}
		}

		controllerutil.RemoveFinalizer(policy, PolicyProtectionFinalizerName)
		return &ctrl.Result{}
	}

	return nil
}

func (in *PolicyReconciler) isAlreadyExists(ctx context.Context, policy *v1alpha1.Policy) (bool, error) {
	if policy.Status.HasReadonlyCondition() {
		return policy.Status.IsReadonly(), nil
	}

	_, err := in.ConsoleClient.GetPolicy(ctx, nil, lo.ToPtr(policy.ConsoleName()))
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	if !policy.Status.HasID() {
		log.FromContext(ctx).Info("Policy already exists in the API, running in read-only mode")
		return true, nil
	}

	return false, nil
}

func (in *PolicyReconciler) handleExistingPolicy(ctx context.Context, policy *v1alpha1.Policy) (ctrl.Result, error) {
	if controllerutil.ContainsFinalizer(policy, PolicyProtectionFinalizerName) {
		controllerutil.RemoveFinalizer(policy, PolicyProtectionFinalizerName)
	}

	exists, err := in.ConsoleClient.IsPolicyExists(ctx, nil, lo.ToPtr(policy.ConsoleName()))
	if err != nil {
		return common.HandleRequeue(nil, err, policy.SetCondition)
	}

	if !exists {
		policy.Status.ID = nil
		utils.MarkCondition(policy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return common.Wait(), nil
	}

	apiPolicy, err := in.ConsoleClient.GetPolicy(ctx, nil, lo.ToPtr(policy.ConsoleName()))
	if err != nil {
		return common.HandleRequeue(nil, err, policy.SetCondition)
	}

	policy.Status.ID = &apiPolicy.ID

	utils.MarkCondition(policy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(policy.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return policy.Spec.Reconciliation.Requeue(), nil
}

func (in *PolicyReconciler) attributes(ctx context.Context, policy *v1alpha1.Policy) (*console.PolicyAttributes, error) {
	attrs := &console.PolicyAttributes{
		Name:        lo.ToPtr(policy.ConsoleName()),
		Type:        policy.Spec.Type,
		Description: policy.Spec.Description,
		Policy:      policy.Spec.Policy,
	}

	if policy.Spec.ProjectRef != nil {
		project, res, err := common.Project(ctx, in.Client, in.Scheme, policy)
		if res != nil || err != nil {
			return nil, fmt.Errorf("failed to get project: %w", err)
		}
		attrs.ProjectID = project.Status.ID
	}

	return attrs, nil
}

func (in *PolicyReconciler) sync(ctx context.Context, policy *v1alpha1.Policy, changed bool) (*console.PolicyFragment, error) {
	logger := log.FromContext(ctx)

	attrs, err := in.attributes(ctx, policy)
	if err != nil {
		return nil, err
	}

	existingPolicy, err := in.ConsoleClient.GetPolicy(ctx, nil, lo.ToPtr(policy.ConsoleName()))
	if err != nil {
		if !errors.IsNotFound(err) {
			return nil, err
		}
		logger.Info(fmt.Sprintf("%s policy does not exist, creating it", policy.ConsoleName()))
		return in.ConsoleClient.CreatePolicy(ctx, *attrs)
	}

	if changed {
		logger.Info(fmt.Sprintf("updating policy %s", policy.ConsoleName()))
		return in.ConsoleClient.UpdatePolicy(ctx, existingPolicy.ID, *attrs)
	}

	return existingPolicy, nil
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (in *PolicyReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "policy_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.Policy{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
