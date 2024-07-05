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
	"github.com/pluralsh/polly/containers"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
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

const NotificationRouterFinalizer = "deployments.plural.sh/notification-router-protection"

// NotificationRouterReconciler reconciles a NotificationRouter object
type NotificationRouterReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=notificationrouters,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=notificationrouters/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=notificationrouters/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *NotificationRouterReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	notificationRouter := &v1alpha1.NotificationRouter{}
	if err := r.Get(ctx, req.NamespacedName, notificationRouter); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	scope, err := NewNotificationRouterScope(ctx, r.Client, notificationRouter)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(notificationRouter.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
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
	utils.SyncNamespacedCredentialsAnnotation(notificationRouter, nc)
	utils.MarkCredentialsCondition(notificationRouter.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(notificationRouter.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if !notificationRouter.GetDeletionTimestamp().IsZero() {
		return ctrl.Result{}, r.handleDelete(ctx, notificationRouter)
	}

	ro, err := r.isReadOnly(ctx, notificationRouter)
	if err != nil {
		if err != nil {
			utils.MarkCondition(notificationRouter.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, fmt.Errorf("could not check if notification router is existing resource, got error: %+v", err)
		}
	}
	if ro {
		logger.V(9).Info("Notification Router already exists in the API, running in read-only mode")
		utils.MarkCondition(notificationRouter.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return r.handleExisting(ctx, notificationRouter)
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(notificationRouter.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	sha, err := utils.HashObject(notificationRouter.Spec)
	if err != nil {
		return ctrl.Result{}, err
	}
	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, notificationRouter)
	if err != nil {
		utils.MarkCondition(notificationRouter.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if !exists || !notificationRouter.Status.IsSHAEqual(sha) {
		logger.Info("upsert notification router", "name", notificationRouter.NotificationName())
		attr, err := r.genNotificationRouterAttr(ctx, notificationRouter)
		if err != nil {
			utils.MarkCondition(notificationRouter.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		ns, err := r.ConsoleClient.UpsertNotificationRouter(ctx, *attr)
		if err != nil {
			utils.MarkCondition(notificationRouter.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		notificationRouter.Status.ID = lo.ToPtr(ns.ID)
		notificationRouter.Status.SHA = lo.ToPtr(sha)
		controllerutil.AddFinalizer(notificationRouter, NotificationRouterFinalizer)
	}

	utils.MarkCondition(notificationRouter.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(notificationRouter.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

func (r *NotificationRouterReconciler) genNotificationRouterAttr(ctx context.Context, router *v1alpha1.NotificationRouter) (*console.NotificationRouterAttributes, error) {
	attr := &console.NotificationRouterAttributes{
		Name: router.NotificationName(),
	}
	events := containers.NewSet[string]()
	events.Add("*")
	for _, event := range router.Spec.Events {
		events.Add(event)
	}
	attr.Events = events.List()

	if len(router.Spec.Filters) > 0 {
		attr.Filters = []*console.RouterFilterAttributes{}
	}
	if len(router.Spec.Sinks) > 0 {
		attr.RouterSinks = []*console.RouterSinkAttributes{}
	}
	for _, filter := range router.Spec.Filters {
		clusterID, err := r.getClusterID(ctx, filter.ClusterRef)
		if err != nil {
			return nil, err
		}
		serviceID, err := r.getServiceID(ctx, filter.ServiceRef)
		if err != nil {
			return nil, err
		}
		pipelineID, err := r.getPipelineID(ctx, filter.PipelineRef)
		if err != nil {
			return nil, err
		}
		attr.Filters = append(attr.Filters, &console.RouterFilterAttributes{
			Regex:      filter.Regex,
			ServiceID:  serviceID,
			ClusterID:  clusterID,
			PipelineID: pipelineID,
		})
	}
	for _, sink := range router.Spec.Sinks {
		notifSink, err := utils.GetNotificationSink(ctx, r.Client, &sink)
		if err != nil {
			return nil, err
		}

		if notifSink.Status.ID == nil {
			return nil, fmt.Errorf("sink %s has not been reconciled", sink.Name)
		}

		attr.RouterSinks = append(attr.RouterSinks, &console.RouterSinkAttributes{SinkID: *notifSink.Status.ID})
	}

	return attr, nil
}

func (r *NotificationRouterReconciler) getClusterID(ctx context.Context, obj *corev1.ObjectReference) (*string, error) {
	if obj == nil {
		return nil, nil
	}
	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, client.ObjectKey{Name: obj.Name, Namespace: obj.Namespace}, cluster); err != nil {
		return nil, err
	}
	if !cluster.Status.HasID() {
		return nil, fmt.Errorf("cluster is not ready yet")
	}
	return cluster.Status.ID, nil
}

func (r *NotificationRouterReconciler) getServiceID(ctx context.Context, objRef *corev1.ObjectReference) (*string, error) {
	if objRef == nil {
		return nil, nil
	}
	resource := &v1alpha1.ServiceDeployment{}
	if err := r.Get(ctx, client.ObjectKey{Name: objRef.Name, Namespace: objRef.Namespace}, resource); err != nil {
		return nil, err
	}
	if !resource.Status.HasID() {
		return nil, fmt.Errorf("cluster is not ready yet")
	}
	return resource.Status.ID, nil
}

func (r *NotificationRouterReconciler) getPipelineID(ctx context.Context, objRef *corev1.ObjectReference) (*string, error) {
	if objRef == nil {
		return nil, nil
	}
	resource := &v1alpha1.Pipeline{}
	if err := r.Get(ctx, client.ObjectKey{Name: objRef.Name, Namespace: objRef.Namespace}, resource); err != nil {
		return nil, err
	}
	if !resource.Status.HasID() {
		return nil, fmt.Errorf("pipeline is not ready yet")
	}
	return resource.Status.ID, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *NotificationRouterReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		// Setting max concurrent reconciles is a hard requirement for current namespace credentials implementation.
		// Following watch ensures that if namespaced credentials change, all objects that use them will be reconciled.
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, handler.EnqueueRequestsFromMapFunc(func(ctx context.Context, nc client.Object) []reconcile.Request {
			list := new(v1alpha1.NotificationRouterList)
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
		For(&v1alpha1.NotificationRouter{}).
		Complete(r)
}

func (r *NotificationRouterReconciler) handleDelete(ctx context.Context, router *v1alpha1.NotificationRouter) error {
	logger := log.FromContext(ctx)
	if controllerutil.ContainsFinalizer(router, NotificationRouterFinalizer) {
		logger.Info("try to delete notification router")
		if router.Status.GetID() != "" {
			existingNotificationSink, err := r.ConsoleClient.GetNotificationRouter(ctx, router.Status.GetID())
			if err != nil && !errors.IsNotFound(err) {
				utils.MarkCondition(router.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return err
			}
			if existingNotificationSink != nil {
				if err := r.ConsoleClient.DeleteNotificationRouter(ctx, *router.Status.ID); err != nil {
					utils.MarkCondition(router.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
					return err
				}
			}
		}
		controllerutil.RemoveFinalizer(router, NotificationRouterFinalizer)
	}
	return nil
}

func (r *NotificationRouterReconciler) isReadOnly(ctx context.Context, router *v1alpha1.NotificationRouter) (bool, error) {
	if router.Status.HasReadonlyCondition() {
		return router.Status.IsReadonly(), nil
	}

	if controllerutil.ContainsFinalizer(router, NotificationRouterFinalizer) {
		return false, nil
	}

	if !router.Spec.HasName() {
		return false, nil
	}

	_, err := r.ConsoleClient.GetNotificationRouterByName(ctx, *router.Spec.Name)
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func (r *NotificationRouterReconciler) handleExisting(ctx context.Context, router *v1alpha1.NotificationRouter) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	logger.Info("handle existing notification router", "name", *router.Spec.Name)
	existing, err := r.ConsoleClient.GetNotificationRouterByName(ctx, *router.Spec.Name)
	if errors.IsNotFound(err) {
		router.Status.ID = nil
		utils.MarkCondition(router.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, "Could not find NotificationSink in Console API")
		return ctrl.Result{}, nil
	}
	if err != nil {
		utils.MarkCondition(router.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	router.Status.ID = &existing.ID
	utils.MarkCondition(router.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return requeue, nil
}

func (r *NotificationRouterReconciler) isAlreadyExists(ctx context.Context, router *v1alpha1.NotificationRouter) (bool, error) {
	if !router.Status.HasID() {
		return false, nil
	}

	_, err := r.ConsoleClient.GetNotificationRouter(ctx, router.Status.GetID())
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}
