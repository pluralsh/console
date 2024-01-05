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

	"github.com/pluralsh/console/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/utils"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	GlobalServiceFinalizer = "deployments.plural.sh/global-service-protection"
)

// GlobalServiceReconciler reconciles a GlobalService object
type GlobalServiceReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=globalservices,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=globalservices/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=globalservices/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *GlobalServiceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)
	globalService := &v1alpha1.GlobalService{}
	if err := r.Get(ctx, req.NamespacedName, globalService); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	scope, err := NewGlobalServiceScope(ctx, r.Client, globalService)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(globalService.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	if !globalService.GetDeletionTimestamp().IsZero() {
		return r.handleDelete(ctx, globalService)
	}

	service := &v1alpha1.ServiceDeployment{}
	if err := r.Get(ctx, client.ObjectKey{Name: globalService.Spec.ServiceRef.Name, Namespace: globalService.Spec.ServiceRef.Namespace}, service); err != nil {
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	if !service.DeletionTimestamp.IsZero() {
		logger.Info("deleting global service after service deployment deletion")
		if err := r.Delete(ctx, globalService); err != nil {
			utils.MarkCondition(globalService.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
			return ctrl.Result{}, err
		}
		return requeue, nil
	}
	if service.Status.ID == nil {
		logger.Info("Service is not ready")
		utils.MarkCondition(service.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "cluster is not ready")
		return requeue, nil
	}

	return ctrl.Result{}, nil
}

func (r *GlobalServiceReconciler) handleDelete(ctx context.Context, service *v1alpha1.GlobalService) (ctrl.Result, error) {
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *GlobalServiceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.GlobalService{}).
		Owns(&v1alpha1.ServiceDeployment{}).
		Complete(r)
}
