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
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	NotificationSinkFinalizer = "deployments.plural.sh/notification-sink-protection"
)

// NotificationSinkReconciler reconciles a NotificationSink object
type NotificationSinkReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=notificationsinks,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=notificationsinks/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=notificationsinks/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *NotificationSinkReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	notificationSink := &v1alpha1.NotificationSink{}
	if err := r.Get(ctx, req.NamespacedName, notificationSink); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	scope, err := NewNotificationSinkScope(ctx, r.Client, notificationSink)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(notificationSink.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
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
	utils.SyncCredentialsInfo(notificationSink, notificationSink.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(notificationSink.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if !notificationSink.GetDeletionTimestamp().IsZero() {
		return ctrl.Result{}, r.handleDelete(ctx, notificationSink)
	}

	ro, err := r.isReadOnly(ctx, notificationSink)
	if err != nil {
		if err != nil {
			utils.MarkCondition(notificationSink.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, fmt.Errorf("could not check if cluster is existing resource, got error: %+v", err)
		}
	}
	if ro {
		logger.V(9).Info("Notification Sink already exists in the API, running in read-only mode")
		utils.MarkCondition(notificationSink.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return r.handleExisting(ctx, notificationSink)
	}

	// Mark resource as managed by this operator.
	utils.MarkCondition(notificationSink.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	sha, err := utils.HashObject(notificationSink.Spec)
	if err != nil {
		return ctrl.Result{}, err
	}
	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, notificationSink)
	if err != nil {
		utils.MarkCondition(notificationSink.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if !exists || !notificationSink.Status.IsSHAEqual(sha) {
		logger.Info("upsert notification sink", "name", notificationSink.NotificationName())
		ns, err := r.ConsoleClient.UpsertNotificationSink(ctx, genNotificationSinkAttr(notificationSink))
		if err != nil {
			utils.MarkCondition(notificationSink.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		notificationSink.Status.ID = lo.ToPtr(ns.ID)
		notificationSink.Status.SHA = lo.ToPtr(sha)
		controllerutil.AddFinalizer(notificationSink, NotificationSinkFinalizer)
	}

	utils.MarkCondition(notificationSink.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(notificationSink.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

func (r *NotificationSinkReconciler) handleExisting(ctx context.Context, notificationSink *v1alpha1.NotificationSink) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	logger.Info("handle existing notification sink", "name", *notificationSink.Spec.Name)
	existing, err := r.ConsoleClient.GetNotificationSinkByName(ctx, *notificationSink.Spec.Name)
	if errors.IsNotFound(err) {
		notificationSink.Status.ID = nil
		utils.MarkCondition(notificationSink.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, "Could not find NotificationSink in Console API")
		return ctrl.Result{}, nil
	}
	if err != nil {
		utils.MarkCondition(notificationSink.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	notificationSink.Spec.Type = existing.Type
	notificationSink.Spec.Configuration = v1alpha1.SinkConfiguration{}
	if existing.Configuration != nil {
		if existing.Configuration.Slack != nil {
			notificationSink.Spec.Configuration.Slack = &v1alpha1.SinkURL{
				URL: existing.Configuration.Slack.URL,
			}
		}
		if existing.Configuration.Teams != nil {
			notificationSink.Spec.Configuration.Teams = &v1alpha1.SinkURL{
				URL: existing.Configuration.Teams.URL,
			}
		}
	}
	notificationSink.Status.ID = &existing.ID
	utils.MarkCondition(notificationSink.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return requeue, nil
}

func (r *NotificationSinkReconciler) isReadOnly(ctx context.Context, notificationSink *v1alpha1.NotificationSink) (bool, error) {
	if notificationSink.Status.HasReadonlyCondition() {
		return notificationSink.Status.IsReadonly(), nil
	}

	if controllerutil.ContainsFinalizer(notificationSink, NotificationSinkFinalizer) {
		return false, nil
	}

	if !notificationSink.Spec.HasName() {
		return false, nil
	}

	_, err := r.ConsoleClient.GetNotificationSinkByName(ctx, *notificationSink.Spec.Name)
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func (r *NotificationSinkReconciler) isAlreadyExists(ctx context.Context, notificationSink *v1alpha1.NotificationSink) (bool, error) {
	if !notificationSink.Status.HasID() {
		return false, nil
	}

	_, err := r.ConsoleClient.GetNotificationSink(ctx, notificationSink.Status.GetID())
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func (r *NotificationSinkReconciler) handleDelete(ctx context.Context, notificationSink *v1alpha1.NotificationSink) error {
	logger := log.FromContext(ctx)
	if controllerutil.ContainsFinalizer(notificationSink, NotificationSinkFinalizer) {
		logger.Info("try to delete notification sink")
		if notificationSink.Status.GetID() != "" {
			existingNotificationSink, err := r.ConsoleClient.GetNotificationSink(ctx, notificationSink.Status.GetID())
			if err != nil && !errors.IsNotFound(err) {
				utils.MarkCondition(notificationSink.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return err
			}
			if existingNotificationSink != nil {
				if err := r.ConsoleClient.DeleteNotificationSink(ctx, *notificationSink.Status.ID); err != nil {
					utils.MarkCondition(notificationSink.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
					return err
				}
			}
		}
		controllerutil.RemoveFinalizer(notificationSink, NotificationSinkFinalizer)
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *NotificationSinkReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                            // Requirement for current namespace credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, utils.HandleCredentialsChange(r.Client, new(v1alpha1.NotificationSinkList))). // Reconcile objects if namespaced credentials change.
		For(&v1alpha1.NotificationSink{}).
		Complete(r)
}

func genNotificationSinkAttr(notificationSink *v1alpha1.NotificationSink) console.NotificationSinkAttributes {
	attr := console.NotificationSinkAttributes{
		Name:          notificationSink.NotificationName(),
		Type:          notificationSink.Spec.Type,
		Configuration: console.SinkConfigurationAttributes{},
	}
	if notificationSink.Spec.Configuration.Slack != nil {
		attr.Configuration.Slack = &console.URLSinkAttributes{
			URL: notificationSink.Spec.Configuration.Slack.URL,
		}
	}
	if notificationSink.Spec.Configuration.Teams != nil {
		attr.Configuration.Teams = &console.URLSinkAttributes{
			URL: notificationSink.Spec.Configuration.Teams.URL,
		}
	}
	return attr
}
