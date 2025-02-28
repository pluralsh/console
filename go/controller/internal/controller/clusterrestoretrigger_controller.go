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

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// ClusterRestoreTriggerReconciler reconciles a ClusterRestoreTrigger object
type ClusterRestoreTriggerReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clusterrestoretriggers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clusterrestoretriggers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clusterrestoretriggers/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *ClusterRestoreTriggerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	trigger := new(v1alpha1.ClusterRestoreTrigger)
	if err := r.Get(ctx, req.NamespacedName, trigger); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	restore := &v1alpha1.ClusterRestore{}
	if err := r.Get(ctx, client.ObjectKey{Name: trigger.Spec.ClusterRestoreRef.Name, Namespace: trigger.Spec.ClusterRestoreRef.Namespace}, restore); err != nil {
		utils.MarkCondition(trigger.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if !restore.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	if !restore.Status.HasID() {
		logger.Info("cluster restore is not ready", "name", restore.Name, "namespace", restore.Namespace)
		return ctrl.Result{}, nil
	}

	if err := utils.TryAddControllerRef(ctx, r.Client, restore, trigger, r.Scheme); err != nil {
		return ctrl.Result{}, err
	}

	scope, err := NewDefaultScope(ctx, r.Client, trigger)
	if err != nil {
		utils.MarkFalse(trigger.SetCondition, v1alpha1.SynchronizedConditionType, v1alpha1.SynchronizedConditionReasonError, err.Error())
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
	credentials.SyncCredentialsInfo(trigger, trigger.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(trigger.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkFalse(trigger.SetCondition, v1alpha1.ReadyConditionType, v1alpha1.ReadyConditionReason, "")

	sha, err := utils.HashObject(trigger.Spec)
	if err != nil {
		return ctrl.Result{}, err
	}
	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, trigger)
	if err != nil {
		utils.MarkCondition(trigger.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if !exists || !trigger.Status.IsSHAEqual(sha) {
		pc, err := r.ConsoleClient.CreateClusterRestore(ctx, *restore.Spec.BackupID)
		if err != nil {
			utils.MarkCondition(trigger.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		trigger.Status.ID = &pc.ID
		trigger.Status.SHA = lo.ToPtr(sha)
	}

	utils.MarkCondition(trigger.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(trigger.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

func (r *ClusterRestoreTriggerReconciler) isAlreadyExists(ctx context.Context, trigger *v1alpha1.ClusterRestoreTrigger) (bool, error) {
	if !trigger.Status.HasID() {
		return false, nil
	}

	_, err := r.ConsoleClient.GetClusterRestore(ctx, trigger.Status.GetID())
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterRestoreTriggerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                                   // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.ClusterRestoreTriggerList))). // Reconcile objects on credentials change.
		For(&v1alpha1.ClusterRestoreTrigger{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
