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

	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/credentials"
	"github.com/pluralsh/console/controller/internal/utils"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const CustomStackRunFinalizer = "deployments.plural.sh/stack-run-protection"

// CustomStackRunReconciler reconciles a CustomStackRun object
type CustomStackRunReconciler struct {
	client.Client
	Scheme           *runtime.Scheme
	ConsoleClient    consoleclient.ConsoleClient
	CredentialsCache credentials.NamespaceCredentialsCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=customstackruns,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=customstackruns/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=customstackruns/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *CustomStackRunReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	stack := &v1alpha1.CustomStackRun{}
	if err := r.Get(ctx, req.NamespacedName, stack); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewCustomStackRunScope(ctx, r.Client, stack)
	if err != nil {
		logger.Error(err, "failed to create custom stack run")
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
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
	utils.SyncNamespacedCredentialsAnnotation(stack, nc)
	utils.MarkCredentialsCondition(stack.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if !stack.GetDeletionTimestamp().IsZero() {
		return ctrl.Result{}, r.handleDelete(ctx, stack)
	}

	sha, err := utils.HashObject(stack.Spec)
	if err != nil {
		return ctrl.Result{}, err
	}
	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, stack)
	if err != nil {
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if !exists {
		logger.Info("create custom stack run", "name", stack.CustomStackRunName())
		attr, err := r.genCustomStackRunAttr(ctx, stack)
		if err != nil {
			utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}

		st, err := r.ConsoleClient.CreateCustomStackRun(ctx, *attr)
		if err != nil {
			utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		stack.Status.ID = lo.ToPtr(st.ID)
		stack.Status.SHA = lo.ToPtr(sha)
		controllerutil.AddFinalizer(stack, CustomStackRunFinalizer)
	}
	if exists && !stack.Status.IsSHAEqual(sha) {
		logger.Info("upsert custom stack run", "name", stack.CustomStackRunName())
		attr, err := r.genCustomStackRunAttr(ctx, stack)
		if err != nil {
			utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		_, err = r.ConsoleClient.UpdateCustomStackRun(ctx, stack.Status.GetID(), *attr)
		if err != nil {
			utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		stack.Status.SHA = lo.ToPtr(sha)
	}

	utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(stack.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CustomStackRunReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		// Setting max concurrent reconciles is a hard requirement for current namespace credentials implementation.
		// Following watch ensures that if namespaced credentials change, all objects that use them will be reconciled.
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, handler.EnqueueRequestsFromMapFunc(func(ctx context.Context, nc client.Object) []reconcile.Request {
			list := new(v1alpha1.CustomStackRunList)
			if err := r.Client.List(context.Background(), list); err != nil {
				return nil
			}

			requests := make([]reconcile.Request, 0, len(list.Items))
			for _, item := range list.Items {
				if utils.HasNamespacedCredentialsAnnotation(item.GetAnnotations(), nc.GetName()) {
					requests = append(requests, reconcile.Request{NamespacedName: types.NamespacedName{Name: item.GetName(), Namespace: item.GetNamespace()}})
				}
			}

			return requests
		})).
		For(&v1alpha1.CustomStackRun{}).
		Complete(r)
}

func (r *CustomStackRunReconciler) isAlreadyExists(ctx context.Context, stack *v1alpha1.CustomStackRun) (bool, error) {
	if !stack.Status.HasID() {
		return false, nil
	}

	_, err := r.ConsoleClient.GetCustomStackRun(ctx, stack.Status.GetID())
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func (r *CustomStackRunReconciler) handleDelete(ctx context.Context, stack *v1alpha1.CustomStackRun) error {
	logger := log.FromContext(ctx)
	if controllerutil.ContainsFinalizer(stack, CustomStackRunFinalizer) {
		logger.Info("try to delete custom stack run")
		if stack.Status.GetID() != "" {
			if err := r.ConsoleClient.DeleteCustomStackRun(ctx, *stack.Status.ID); err != nil && !errors.IsNotFound(err) {
				utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return err
			}
		}
		controllerutil.RemoveFinalizer(stack, CustomStackRunFinalizer)
		logger.Info("custom stack run deleted successfully")
	}
	return nil
}

func (r *CustomStackRunReconciler) genCustomStackRunAttr(ctx context.Context, stackRun *v1alpha1.CustomStackRun) (*console.CustomStackRunAttributes, error) {
	attr := &console.CustomStackRunAttributes{
		Name:          stackRun.CustomStackRunName(),
		Documentation: stackRun.Spec.Documentation,
		Commands:      nil,
		Configuration: nil,
	}
	if stackRun.Spec.StackRef != nil {
		stack := &v1alpha1.InfrastructureStack{}
		if err := r.Get(ctx, client.ObjectKey{Name: stackRun.Spec.StackRef.Name, Namespace: stackRun.Namespace}, stack); err != nil {
			return nil, err
		}
		attr.StackID = stack.Status.ID
	}
	if stackRun.Spec.Commands != nil {
		attr.Commands = make([]*console.CommandAttributes, 0)
		attr.Commands = algorithms.Map(stackRun.Spec.Commands, func(b v1alpha1.CommandAttributes) *console.CommandAttributes {
			return b.Attributes()
		})
	}
	if stackRun.Spec.Configuration != nil {
		attr.Configuration = make([]*console.PrConfigurationAttributes, 0)
		attr.Configuration = algorithms.Map(stackRun.Spec.Configuration, func(b v1alpha1.PrAutomationConfiguration) *console.PrConfigurationAttributes {
			return b.Attributes()
		})
	}

	return attr, nil
}
