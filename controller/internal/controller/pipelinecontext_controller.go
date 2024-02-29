/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controller

import (
	"context"

	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/api/v1alpha1"
	deploymentsv1alpha1 "github.com/pluralsh/console/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/utils"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// PipelineContextReconciler reconciles a PipelineContext object
type PipelineContextReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=pipelinecontexts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=pipelinecontexts/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=pipelinecontexts/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *PipelineContextReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)
	logger.Info("Reconcile PipelineContext", "namespace", req.Namespace, "name", req.Name)
	pipelineContext := new(v1alpha1.PipelineContext)
	if err := r.Get(ctx, req.NamespacedName, pipelineContext); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	pipline := &v1alpha1.Pipeline{}
	if err := r.Get(ctx, client.ObjectKey{Name: pipelineContext.Spec.PipelineRef.Name, Namespace: pipelineContext.Spec.PipelineRef.Namespace}, pipline); err != nil {
		utils.MarkCondition(pipelineContext.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if !pipline.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	if !pipline.Status.HasID() {
		logger.Info("pipeline is not ready yet", "name", pipline.Name, "namespace", pipline.Namespace)
		return ctrl.Result{}, nil
	}

	if err := utils.TryAddControllerRef(ctx, r.Client, pipline, pipelineContext, r.Scheme); err != nil {
		return ctrl.Result{}, err
	}

	scope, err := NewPipelineContextScope(ctx, r.Client, pipelineContext)
	if err != nil {
		utils.MarkFalse(pipelineContext.SetCondition, v1alpha1.SynchronizedConditionType, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkFalse(pipelineContext.SetCondition, v1alpha1.ReadyConditionType, v1alpha1.ReadyConditionReason, "")

	sha, err := utils.HashObject(pipelineContext.Spec)
	if err != nil {
		return ctrl.Result{}, err
	}

	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, pipelineContext)
	if err != nil {
		utils.MarkCondition(pipelineContext.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if !exists || !pipelineContext.Status.IsSHAEqual(sha) {
		pc, err := r.ConsoleClient.CreatePipelineContext(ctx, pipline.Status.GetID(), console.PipelineContextAttributes{
			Context: string(pipelineContext.Spec.Context.Raw),
		})
		if err != nil {
			utils.MarkCondition(pipelineContext.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		pipelineContext.Status.ID = &pc.CreatePipelineContext.ID
		pipelineContext.Status.SHA = lo.ToPtr(sha)
	}

	utils.MarkCondition(pipelineContext.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(pipelineContext.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *PipelineContextReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&deploymentsv1alpha1.PipelineContext{}).
		Complete(r)
}

func (r *PipelineContextReconciler) isAlreadyExists(ctx context.Context, pipelineContext *v1alpha1.PipelineContext) (bool, error) {
	if !pipelineContext.Status.HasID() {
		return false, nil
	}

	_, err := r.ConsoleClient.GetPipelineContext(ctx, pipelineContext.Status.GetID())
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}
