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
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/errors"
	"github.com/pluralsh/console/controller/internal/utils"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
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
		utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
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
		utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	if !service.DeletionTimestamp.IsZero() {
		logger.Info("deleting global service after service deployment deletion")
		if err := r.Delete(ctx, globalService); err != nil {
			utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
			return ctrl.Result{}, err
		}
		return requeue, nil
	}
	if service.Status.ID == nil {
		logger.Info("Service is not ready")
		utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "cluster is not ready")
		return requeue, nil
	}

	provider := &v1alpha1.Provider{}
	if err := r.Get(ctx, types.NamespacedName{Name: globalService.Spec.ProviderRef.Name}, provider); err != nil {
		utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	if provider.Status.ID == nil {
		logger.Info("Provider is not ready")
		utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "cluster is not ready")
		return requeue, nil
	}

	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, client.ObjectKey{Name: service.Spec.ClusterRef.Name, Namespace: service.Spec.ClusterRef.Namespace}, cluster); err != nil {
		utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	attr := console.GlobalServiceAttributes{
		Name:       globalService.Name,
		Distro:     globalService.Spec.Distro,
		ProviderID: provider.Status.ID,
	}
	if globalService.Spec.Tags != nil {
		attr.Tags = genGlobalServiceTags(globalService.Spec.Tags)
	}
	sha, err := utils.HashObject(attr)
	if err != nil {
		utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	if !globalService.Status.HasID() {
		controllerutil.AddFinalizer(globalService, GlobalServiceFinalizer)
		createGlobalService, err := r.ConsoleClient.CreateGlobalService(*service.Status.ID, attr)
		if err != nil {
			utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
			return ctrl.Result{}, err
		}
		globalService.Status.ID = &createGlobalService.ID
		globalService.Status.SHA = &sha
		utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
		return ctrl.Result{}, nil
	}

	existingGlobalService, err := r.ConsoleClient.GetGlobalService(globalService.Status.GetID())
	if err != nil {
		utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	if !globalService.Status.IsSHAEqual(sha) {
		_, err := r.ConsoleClient.UpdateGlobalService(existingGlobalService.ID, attr)
		if err != nil {
			utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
			return ctrl.Result{}, err
		}
	}

	if err := utils.TryAddControllerRef(ctx, r.Client, service, globalService, r.Scheme); err != nil {
		utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	globalService.Status.SHA = &sha
	utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	return ctrl.Result{}, nil
}

func (r *GlobalServiceReconciler) handleDelete(ctx context.Context, service *v1alpha1.GlobalService) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	if controllerutil.ContainsFinalizer(service, GlobalServiceFinalizer) {
		logger.Info("try to delete global service")
		if service.Status.GetID() != "" {
			existingGlobalService, err := r.ConsoleClient.GetGlobalService(service.Status.GetID())
			if err != nil && !errors.IsNotFound(err) {
				utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
				return ctrl.Result{}, err
			}
			if existingGlobalService != nil {
				if err := r.ConsoleClient.DeleteGlobalService(*service.Status.ID); err != nil {
					utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
					return ctrl.Result{}, err
				}
			}
		}
		controllerutil.RemoveFinalizer(service, GlobalServiceFinalizer)
	}
	return ctrl.Result{}, nil
}

func genGlobalServiceTags(existing map[string]string) []*console.TagAttributes {
	tags := make([]*console.TagAttributes, 0)
	for k, v := range existing {
		tags = append(tags, &console.TagAttributes{
			Name:  k,
			Value: v,
		})
	}
	return tags
}

// SetupWithManager sets up the controller with the Manager.
func (r *GlobalServiceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.GlobalService{}).
		Owns(&v1alpha1.ServiceDeployment{}).
		Complete(r)
}
