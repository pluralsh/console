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

	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	utilerrors "k8s.io/apimachinery/pkg/util/errors"
	"k8s.io/client-go/util/workqueue"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	internaltypes "github.com/pluralsh/console/go/controller/internal/types"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	GlobalServiceFinalizer = "deployments.plural.sh/global-service-protection"
)

// GlobalServiceReconciler reconciles a GlobalService object
type GlobalServiceReconciler struct {
	client.Client
	ConsoleClient      consoleclient.ConsoleClient
	Scheme             *runtime.Scheme
	CredentialsCache   credentials.NamespaceCredentialsCache
	GlobalServiceQueue workqueue.TypedRateLimitingInterface[ctrl.Request]
}

// Queue implements the types.Processor interface.
func (r *GlobalServiceReconciler) Queue() workqueue.TypedRateLimitingInterface[ctrl.Request] {
	return r.GlobalServiceQueue
}

func (r *GlobalServiceReconciler) Name() internaltypes.Reconciler {
	return internaltypes.GlobalServiceReconciler
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=globalservices,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=globalservices/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=globalservices/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop.
func (r *GlobalServiceReconciler) Reconcile(_ context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.GlobalServiceQueue.Add(req)
	return ctrl.Result{}, nil
}

// Process implements the types.Processor interface.
func (r *GlobalServiceReconciler) Process(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	globalService := &v1alpha1.GlobalService{}
	if err := r.Get(ctx, req.NamespacedName, globalService); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, r.Client, globalService)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	utils.MarkCondition(globalService.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := r.ConsoleClient.UseCredentials(req.Namespace, r.CredentialsCache)
	credentials.SyncCredentialsInfo(globalService, globalService.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if !globalService.GetDeletionTimestamp().IsZero() {
		return ctrl.Result{}, r.handleDelete(globalService)
	}

	if globalService.Spec.ServiceRef == nil && globalService.Spec.Template == nil {
		return ctrl.Result{}, fmt.Errorf("the spec.serviceRef and spec.template can't be null")
	}

	service, result, err := r.getService(ctx, globalService)
	if result != nil || err != nil {
		return common.HandleRequeue(result, err, globalService.SetCondition)
	}

	project, result, err := common.Project(ctx, r.Client, r.Scheme, globalService)
	if result != nil || err != nil {
		return common.HandleRequeue(result, err, globalService.SetCondition)
	}

	attr := globalService.Attributes(project.Status.ID)

	if id, ok := globalService.GetAnnotations()[InventoryAnnotation]; ok && id != "" {
		attr.ParentID = lo.ToPtr(id)
	}

	if globalService.Spec.Template != nil {
		repository, err := r.getRepository(ctx, globalService)
		if err != nil {
			return ctrl.Result{}, err
		}
		st, err := common.ServiceTemplateAttributes(ctx, r.Client, globalService.GetNamespace(), globalService.Spec.Template, repository.Status.ID)
		if err != nil {
			return common.HandleRequeue(nil, err, globalService.SetCondition)
		}

		if st.Name == nil {
			st.Name = lo.ToPtr(globalService.GetName())
		}

		if st.Namespace == nil {
			st.Namespace = lo.ToPtr(globalService.GetNamespace())
		}

		attr.Template = st
	}

	attr.IgnoreClusters = r.ignoreClusters(ctx, globalService)

	sha, err := utils.HashObject(attr)
	if err != nil {
		utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	existingGlobalService, err := r.ConsoleClient.GetGlobalServiceByName(globalService.ConsoleName())
	if err != nil && !errors.IsNotFound(err) {
		utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if existingGlobalService == nil {
		controllerutil.AddFinalizer(globalService, GlobalServiceFinalizer)
		if err := r.handleCreate(sha, globalService, service, attr); err != nil {
			utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		existingGlobalService, err = r.ConsoleClient.GetGlobalService(globalService.Status.GetID())
		if err != nil {
			utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
	}

	if !globalService.Status.IsSHAEqual(sha) {
		_, err := r.ConsoleClient.UpdateGlobalService(existingGlobalService.ID, attr)
		if err != nil {
			utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return globalService.Spec.Reconciliation.Requeue(), err
		}
	}

	if service != nil {
		if err := utils.TryAddControllerRef(ctx, r.Client, service, globalService.DeepCopy(), r.Scheme); err != nil {
			utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
	}

	globalService.Status.SHA = &sha
	globalService.Status.ID = &existingGlobalService.ID
	utils.MarkCondition(globalService.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(globalService.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	return globalService.Spec.Reconciliation.Requeue(), nil
}

func (r *GlobalServiceReconciler) ignoreClusters(ctx context.Context, globalService *v1alpha1.GlobalService) []*string {
	if globalService.Spec.IgnoreClusters == nil {
		return nil
	}
	logger := log.FromContext(ctx)

	clusters := make([]*string, 0)
	errorsList := make([]error, 0)
	for _, handle := range globalService.Spec.IgnoreClusters {
		clusterID, err := r.ConsoleClient.GetClusterIdByHandle(handle)
		if err != nil {
			errorsList = append(errorsList, err)
			continue
		}
		clusters = append(clusters, lo.ToPtr(clusterID))
	}
	if len(errorsList) > 0 {
		logger.Info("failed to get cluster ids for global service", "errors", utilerrors.NewAggregate(errorsList), "globalService", globalService.Name, "namespace", globalService.Namespace)
	}
	return clusters
}

func (r *GlobalServiceReconciler) getService(ctx context.Context, globalService *v1alpha1.GlobalService) (*v1alpha1.ServiceDeployment, *ctrl.Result, error) {
	if globalService.Spec.ServiceRef == nil {
		return nil, nil, nil
	}

	service := &v1alpha1.ServiceDeployment{}
	if err := r.Get(ctx, client.ObjectKey{Name: globalService.Spec.ServiceRef.Name, Namespace: globalService.Spec.ServiceRef.Namespace}, service); err != nil {
		return nil, nil, err
	}

	logger := log.FromContext(ctx)
	if !service.DeletionTimestamp.IsZero() {
		logger.Info("deleting global service after service deployment deletion")
		if err := r.Delete(ctx, globalService); err != nil {
			return nil, nil, err
		}
		return nil, lo.ToPtr(common.Wait()), nil
	}

	if !service.Status.HasID() {
		return nil, lo.ToPtr(common.Wait()), fmt.Errorf("service is not ready")
	}

	return service, nil, nil
}

func (r *GlobalServiceReconciler) handleCreate(sha string, global *v1alpha1.GlobalService, svc *v1alpha1.ServiceDeployment, attrs console.GlobalServiceAttributes) error {
	var err error
	var createGlobalService *console.GlobalServiceFragment
	if svc == nil {
		createGlobalService, err = r.ConsoleClient.CreateGlobalServiceFromTemplate(attrs)
	} else {
		createGlobalService, err = r.ConsoleClient.CreateGlobalService(*svc.Status.ID, attrs)
	}
	if err != nil {
		utils.MarkCondition(global.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return err
	}
	global.Status.ID = &createGlobalService.ID
	global.Status.SHA = &sha
	return nil
}

func (r *GlobalServiceReconciler) handleDelete(service *v1alpha1.GlobalService) error {
	if controllerutil.ContainsFinalizer(service, GlobalServiceFinalizer) {
		if service.Status.GetID() != "" {
			existingGlobalService, err := r.ConsoleClient.GetGlobalService(service.Status.GetID())
			if err != nil && !errors.IsNotFound(err) {
				utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return err
			}
			if existingGlobalService != nil {
				if err := r.ConsoleClient.DeleteGlobalService(*service.Status.ID); err != nil {
					utils.MarkCondition(service.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
					return err
				}
			}
		}
		controllerutil.RemoveFinalizer(service, GlobalServiceFinalizer)
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *GlobalServiceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}). // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.GlobalServiceList))). // Reconcile objects on credentials change.
		For(&v1alpha1.GlobalService{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&v1alpha1.ServiceDeployment{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

func (r *GlobalServiceReconciler) getRepository(ctx context.Context, ns *v1alpha1.GlobalService) (*v1alpha1.GitRepository, error) {
	repository := &v1alpha1.GitRepository{}
	if ns.Spec.Template.RepositoryRef != nil {
		if err := r.Get(ctx, client.ObjectKey{Name: ns.Spec.Template.RepositoryRef.Name, Namespace: ns.Spec.Template.RepositoryRef.Namespace}, repository); err != nil {
			return nil, err
		}
		if !repository.Status.HasID() {
			return nil, fmt.Errorf("repository %s is not ready", repository.Name)
		}
		if repository.Status.Health == v1alpha1.GitHealthFailed {
			return nil, fmt.Errorf("repository %s is not healthy", repository.Name)
		}
	}
	return repository, nil
}
