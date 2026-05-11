package controller

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/pluralsh/deployment-operator/pkg/common"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/utils"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

type AgentConfigurationReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

// Reconcile AgentConfiguration custom resources to ensure that Console stays in sync with Kubernetes cluster.
func (r *AgentConfigurationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)
	if req.Name != "default" {
		logger.Error(fmt.Errorf("expected 'default' name, got %s", req.Name), "")
		return reconcile.Result{}, nil
	}
	config := &v1alpha1.AgentConfiguration{}
	if err := r.Get(ctx, req.NamespacedName, config); err != nil {
		logger.Error(err, "Unable to fetch AgentConfiguration")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(config.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Ensure that status updates will always be persisted when exiting this function.
	scope, err := NewDefaultScope(ctx, r.Client, config)
	if err != nil {
		logger.Error(err, "Failed to create cluster scope")
		utils.MarkCondition(config.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	if err := common.GetConfigurationManager().SetValue(config.Spec); err != nil {
		logger.Error(err, "Unable to set configuration")
		utils.MarkCondition(config.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	LogOverriddenCRDValues(ctx, config.Spec)

	utils.MarkCondition(config.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *AgentConfigurationReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.AgentConfiguration{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

func LogOverriddenCRDValues(ctx context.Context, spec v1alpha1.AgentConfigurationSpec) {
	logger := log.FromContext(ctx)

	res, err := json.Marshal(spec)
	if err == nil {
		logger.Info("Overridden config from CRD", "configuration: ", string(res))
	}
}
