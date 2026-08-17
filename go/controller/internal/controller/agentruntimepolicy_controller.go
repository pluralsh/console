package controller

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/samber/lo"
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

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const managementClusterHandle = "mgmt"

// AgentRuntimePolicyReconciler reconciles a v1alpha1.AgentRuntimePolicy object.
// Implements reconcile.Reconciler and types.Controller.
type AgentRuntimePolicyReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=agentruntimepolicies,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=agentruntimepolicies/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=agentruntimepolicies/finalizers,verbs=update

// Reconcile applies centrally managed create bindings onto an existing AgentRuntime
// on the management cluster by reading the current runtime and upserting only createBindings.
func (in *AgentRuntimePolicyReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	policy := new(v1alpha1.AgentRuntimePolicy)
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

	utils.MarkCondition(policy.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	if !policy.GetDeletionTimestamp().IsZero() {
		return ctrl.Result{}, nil
	}

	runtime, clusterID, result, err := in.getAgentRuntime(ctx, policy.RuntimeName())
	if result != nil || err != nil {
		return common.HandleRequeue(result, err, policy.SetCondition)
	}

	changed, sha, err := policy.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate agent runtime policy SHA")
		utils.MarkCondition(policy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if changed {
		runtime, err = in.ConsoleClient.UpsertAgentRuntime(ctx, agentRuntimePolicyAttributes(runtime, clusterID, createBindingsAttributes(policy)))
		if err != nil {
			return common.HandleRequeue(nil, err, policy.SetCondition)
		}
		policy.Status.SHA = &sha
	}

	policy.Status.ID = &runtime.ID

	utils.MarkCondition(policy.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(policy.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return policy.Spec.Reconciliation.Requeue(), nil
}

func (in *AgentRuntimePolicyReconciler) getAgentRuntime(ctx context.Context, runtimeName string) (*console.AgentRuntimeFragment, string, *ctrl.Result, error) {
	cluster, err := in.ConsoleClient.GetClusterByHandle(lo.ToPtr(managementClusterHandle))
	if err != nil {
		if errors.IsNotFound(err) {
			return nil, "", lo.ToPtr(common.Wait()), fmt.Errorf("cluster not found: %s", err.Error())
		}

		return nil, "", nil, fmt.Errorf("failed to get cluster: %s", err.Error())
	}

	apiAgentRuntime, err := in.ConsoleClient.GetAgentRuntime(ctx, runtimeName, cluster.ID)
	if err != nil {
		if errors.IsNotFound(err) {
			return nil, "", lo.ToPtr(common.Wait()), fmt.Errorf("agent runtime not found: %s", err.Error())
		}

		return nil, "", nil, fmt.Errorf("failed to get agent runtime: %s", err.Error())
	}

	return apiAgentRuntime, cluster.ID, nil, nil
}

func createBindingsAttributes(policy *v1alpha1.AgentRuntimePolicy) []*console.AgentBindingAttributes {
	if policy.Spec.Bindings == nil || policy.Spec.Bindings.Create == nil {
		return []*console.AgentBindingAttributes{}
	}

	return algorithms.Map(policy.Spec.Bindings.Create, func(b v1alpha1.Binding) *console.AgentBindingAttributes {
		return &console.AgentBindingAttributes{
			UserEmail: b.UserEmail,
			GroupName: b.GroupName,
		}
	})
}

func agentRuntimePolicyAttributes(runtime *console.AgentRuntimeFragment, clusterID string, createBindings []*console.AgentBindingAttributes) console.AgentRuntimeAttributes {
	return console.AgentRuntimeAttributes{
		Name:           runtime.Name,
		Type:           runtime.Type,
		ClusterID:      lo.ToPtr(clusterID),
		CreateBindings: createBindings,
	}
}

func (in *AgentRuntimePolicyReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.AgentRuntimePolicy{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
