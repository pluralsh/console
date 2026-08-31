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

// BindingPolicyReconciler reconciles a v1alpha1.BindingPolicy object.
// Implements reconcile.Reconciler and types.Controller.
type BindingPolicyReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

const (
	// BindingPolicyProtectionFinalizerName defines name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	BindingPolicyProtectionFinalizerName = "bindingpolicies.deployments.plural.sh/bindingpolicy-protection"
)

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=bindingpolicies,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=bindingpolicies/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=bindingpolicies/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.BindingPolicy closer to the desired state
// and syncs it with the Console API state.
func (in *BindingPolicyReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	bindingPolicy := new(v1alpha1.BindingPolicy)
	if err := in.Get(ctx, req.NamespacedName, bindingPolicy); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, in.Client, bindingPolicy)
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
	utils.MarkCondition(bindingPolicy.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer.
	result, err := in.addOrRemoveFinalizer(ctx, bindingPolicy)
	if result != nil {
		return *result, err
	}

	// Resolve policyRef and bindPolicyRef to Console API IDs.
	policyID, bindPolicyID, res, err := in.resolvePolicyRefs(ctx, bindingPolicy)
	if res != nil || err != nil {
		return common.HandleRequeue(res, err, bindingPolicy.SetCondition)
	}

	// Get BindingPolicy SHA that can be saved back in the status to check for changes.
	changed, sha, err := bindingPolicy.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate binding policy SHA")
		utils.MarkCondition(bindingPolicy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync BindingPolicy CRD with the Console API.
	apiBindingPolicy, err := in.sync(ctx, bindingPolicy, policyID, bindPolicyID, changed)
	if err != nil {
		return common.HandleRequeue(nil, err, bindingPolicy.SetCondition)
	}

	bindingPolicy.Status.ID = &apiBindingPolicy.ID
	bindingPolicy.Status.SHA = &sha

	utils.MarkCondition(bindingPolicy.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(bindingPolicy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return bindingPolicy.Spec.Reconciliation.Requeue(), nil
}

func (in *BindingPolicyReconciler) addOrRemoveFinalizer(ctx context.Context, bindingPolicy *v1alpha1.BindingPolicy) (*ctrl.Result, error) {
	if bindingPolicy.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(bindingPolicy, BindingPolicyProtectionFinalizerName) {
		controllerutil.AddFinalizer(bindingPolicy, BindingPolicyProtectionFinalizerName)
		return nil, nil
	}

	if !bindingPolicy.DeletionTimestamp.IsZero() {
		if !bindingPolicy.Status.HasID() {
			controllerutil.RemoveFinalizer(bindingPolicy, BindingPolicyProtectionFinalizerName)
			return &ctrl.Result{}, nil
		}

		exists, err := in.ConsoleClient.IsBindingPolicyExists(ctx, bindingPolicy.Status.GetID())
		if err != nil {
			return lo.ToPtr(bindingPolicy.Spec.Reconciliation.Requeue()), nil
		}

		if exists {
			if err = in.ConsoleClient.DeleteBindingPolicy(ctx, bindingPolicy.Status.GetID()); err != nil {
				utils.MarkCondition(bindingPolicy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return lo.ToPtr(common.Wait()), nil
			}
		}

		controllerutil.RemoveFinalizer(bindingPolicy, BindingPolicyProtectionFinalizerName)
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

// resolvePolicyRefs reads the Policy CRDs referenced by policyRef and bindPolicyRef
// and returns their Console API IDs. Returns a requeue result when either Policy is not yet ready.
func (in *BindingPolicyReconciler) resolvePolicyRefs(ctx context.Context, bindingPolicy *v1alpha1.BindingPolicy) (policyID, bindPolicyID string, res *ctrl.Result, err error) {
	policyID, res, err = in.resolvePolicyRef(ctx, bindingPolicy.Spec.PolicyRef.Name)
	if res != nil || err != nil {
		return
	}

	bindPolicyID, res, err = in.resolvePolicyRef(ctx, bindingPolicy.Spec.BindPolicyRef.Name)
	return
}

func (in *BindingPolicyReconciler) resolvePolicyRef(ctx context.Context, name string) (string, *ctrl.Result, error) {
	policy := new(v1alpha1.Policy)
	if err := in.Get(ctx, client.ObjectKey{Name: name}, policy); err != nil {
		if errors.IsNotFound(err) {
			return "", lo.ToPtr(common.Wait()), fmt.Errorf("policy %q not found", name)
		}
		return "", nil, fmt.Errorf("failed to get policy %q: %w", name, err)
	}

	if !policy.Status.HasID() {
		return "", lo.ToPtr(common.Wait()), fmt.Errorf("policy %q is not yet ready", name)
	}

	return policy.Status.GetID(), nil, nil
}

func (in *BindingPolicyReconciler) attributes(bindingPolicy *v1alpha1.BindingPolicy, policyID, bindPolicyID string) console.BindingPolicyAttributes {
	attrs := console.BindingPolicyAttributes{
		PolicyID:     policyID,
		BindPolicyID: bindPolicyID,
		Type:         bindingPolicy.Spec.Type,
		Interval:     bindingPolicy.Spec.Interval,
	}

	if bindingPolicy.Spec.Matches != nil && bindingPolicy.Spec.Matches.Workbench != nil {
		attrs.Matches = &console.BindingPolicyMatchesAttributes{
			Workbench: &console.WorkbenchPolicyMatchesAttributes{
				Regexes: bindingPolicy.Spec.Matches.Workbench.Regexes,
			},
		}
	}

	return attrs
}

func (in *BindingPolicyReconciler) updateAttributes(bindingPolicy *v1alpha1.BindingPolicy, policyID, bindPolicyID string) console.BindingPolicyUpdateAttributes {
	attrs := console.BindingPolicyUpdateAttributes{
		PolicyID:     lo.ToPtr(policyID),
		BindPolicyID: lo.ToPtr(bindPolicyID),
		Type:         bindingPolicy.Spec.Type,
		Interval:     bindingPolicy.Spec.Interval,
	}

	if bindingPolicy.Spec.Matches != nil && bindingPolicy.Spec.Matches.Workbench != nil {
		attrs.Matches = &console.BindingPolicyMatchesAttributes{
			Workbench: &console.WorkbenchPolicyMatchesAttributes{
				Regexes: bindingPolicy.Spec.Matches.Workbench.Regexes,
			},
		}
	}

	return attrs
}

func (in *BindingPolicyReconciler) sync(ctx context.Context, bindingPolicy *v1alpha1.BindingPolicy, policyID, bindPolicyID string, changed bool) (*console.BindingPolicyFragment, error) {
	logger := log.FromContext(ctx)

	if !bindingPolicy.Status.HasID() {
		logger.Info(fmt.Sprintf("creating binding policy %s", bindingPolicy.Name))
		return in.ConsoleClient.CreateBindingPolicy(ctx, in.attributes(bindingPolicy, policyID, bindPolicyID))
	}

	exists, err := in.ConsoleClient.IsBindingPolicyExists(ctx, bindingPolicy.Status.GetID())
	if err != nil {
		return nil, err
	}

	if !exists {
		logger.Info(fmt.Sprintf("binding policy %s not found in API, recreating", bindingPolicy.Name))
		return in.ConsoleClient.CreateBindingPolicy(ctx, in.attributes(bindingPolicy, policyID, bindPolicyID))
	}

	if changed {
		logger.Info(fmt.Sprintf("updating binding policy %s", bindingPolicy.Name))
		return in.ConsoleClient.UpdateBindingPolicy(ctx, bindingPolicy.Status.GetID(), in.updateAttributes(bindingPolicy, policyID, bindPolicyID))
	}

	return in.ConsoleClient.GetBindingPolicy(ctx, bindingPolicy.Status.GetID())
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (in *BindingPolicyReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "bindingpolicy_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.BindingPolicy{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
