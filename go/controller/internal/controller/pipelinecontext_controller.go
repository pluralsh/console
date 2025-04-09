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
	"fmt"

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

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	deploymentsv1alpha1 "github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// PipelineContextReconciler reconciles a PipelineContext object
type PipelineContextReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
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
	utils.MarkCondition(pipelineContext.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	pipeline := &v1alpha1.Pipeline{}
	if err := r.Get(ctx, client.ObjectKey{Name: pipelineContext.Spec.PipelineRef.Name, Namespace: pipelineContext.Spec.PipelineRef.Namespace}, pipeline); err != nil {
		utils.MarkCondition(pipelineContext.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if !pipeline.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	if !pipeline.Status.HasID() {
		logger.Info("pipeline is not ready", "name", pipeline.Name, "namespace", pipeline.Namespace)
		return requeue, nil
	}

	if err := utils.TryAddControllerRef(ctx, r.Client, pipeline, pipelineContext, r.Scheme); err != nil {
		return ctrl.Result{}, err
	}
	scope, err := NewDefaultScope(ctx, r.Client, pipelineContext)
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

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := r.ConsoleClient.UseCredentials(req.Namespace, r.CredentialsCache)
	credentials.SyncCredentialsInfo(pipelineContext, pipelineContext.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(pipelineContext.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

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
		pc, err := r.ConsoleClient.CreatePipelineContext(ctx, pipeline.Status.GetID(), console.PipelineContextAttributes{
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
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                             // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.PipelineContextList))). // Reconcile objects on credentials change.
		For(&deploymentsv1alpha1.PipelineContext{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
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
