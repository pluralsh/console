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
	"github.com/pluralsh/console/controller/internal/utils"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// ClusterRestoreReconciler reconciles a ClusterRestore object
type ClusterRestoreReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clusterrestores,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clusterrestores/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clusterrestores/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *ClusterRestoreReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	// Read resource from Kubernetes cluster.
	restore := &v1alpha1.ClusterRestore{}
	if err := r.Get(ctx, req.NamespacedName, restore); err != nil {
		logger.Error(err, "Unable to fetch restore")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(restore.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Ensure that status updates will always be persisted when exiting this function.
	scope, err := NewClusterRestoreScope(ctx, r.Client, restore)
	if err != nil {
		logger.Error(err, "Failed to create restore scope")
		utils.MarkCondition(restore.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Handle resource deletion both in Kubernetes cluster and in Console API.
	if !restore.GetDeletionTimestamp().IsZero() {
		utils.MarkCondition(restore.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReasonDeleting, "")
		utils.MarkCondition(restore.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonDeleting, "")
		return ctrl.Result{}, nil
	}

	// Sync resource with Console API.
	apiRestore, err := r.sync(ctx, restore)
	if err != nil {
		utils.MarkCondition(restore.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Update resource status.
	restore.Status.ID = &apiRestore.ID
	restore.Status.Status = apiRestore.Status
	if apiRestore.Status == console.RestoreStatusSuccessful {
		utils.MarkCondition(restore.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	} else {
		utils.MarkCondition(restore.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, fmt.Sprintf("Restore has %s status", apiRestore.Status))
	}
	utils.MarkCondition(restore.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, nil
}

func (r *ClusterRestoreReconciler) sync(ctx context.Context, restore *v1alpha1.ClusterRestore) (*console.ClusterRestoreFragment, error) {
	exists := r.ConsoleClient.IsClusterRestoreExisting(ctx, restore.Status.GetID())
	logger := log.FromContext(ctx)

	if exists {
		logger.V(9).Info(fmt.Sprintf("No changes detected for %s cluster", restore.Name))
		return r.ConsoleClient.GetClusterRestore(ctx, restore.Status.GetID())
	}

	var backupID string
	if restore.Spec.HasBackupID() {
		backupID = restore.Spec.GetBackupID()
	} else {
		cluster := &v1alpha1.Cluster{}
		key := client.ObjectKey{Name: restore.Spec.BackupClusterRef.Name, Namespace: restore.Spec.BackupClusterRef.Namespace}
		if err := r.Get(ctx, key, cluster); err != nil {
			return nil, err
		}
		if !cluster.Status.HasID() {
			return nil, fmt.Errorf("cluster has no ID set yet")
		}

		backup, err := r.ConsoleClient.GetClusterBackup(cluster.Status.ID, restore.Spec.BackupNamespace, restore.Spec.BackupName)
		if err != nil {
			return nil, err
		}
		backupID = backup.ID
	}

	logger.Info(fmt.Sprintf("%s cluster does not exist, creating it", restore.Name))
	return r.ConsoleClient.CreateClusterRestore(ctx, backupID)
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterRestoreReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.ClusterRestore{}).
		Complete(r)
}
