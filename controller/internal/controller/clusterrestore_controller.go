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
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const (
	ClusterRestoreFinalizer = "deployments.plural.sh/cluster-restore-protection"
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
// TODO(user): Modify the Reconcile function to compare the state specified by
// the ClusterRestore object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
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
	if result := r.addOrRemoveFinalizer(restore); result != nil {
		return *result, nil
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
	exists := r.ConsoleClient.IsClusterRestoreExisting(restore.Status.GetID())
	logger := log.FromContext(ctx)

	if exists {
		logger.V(9).Info(fmt.Sprintf("No changes detected for %s cluster", restore.Name))
		return r.ConsoleClient.GetClusterRestore(restore.Status.GetID())
	}

	var backupID string
	if restore.Spec.HasBackupID() {
		backupID = restore.Spec.GetBackupID()
	} else {
		backup, err := r.ConsoleClient.GetClusterBackup(restore.Spec.BackupClusterID, restore.Spec.BackupNamespace, restore.Spec.BackupName)
		if err != nil {
			return nil, err
		}
		backupID = backup.ID
	}

	logger.Info(fmt.Sprintf("%s cluster does not exist, creating it", restore.Name))
	return r.ConsoleClient.CreateClusterRestore(backupID)
}

func (r *ClusterRestoreReconciler) addOrRemoveFinalizer(restore *v1alpha1.ClusterRestore) *ctrl.Result {
	/// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if restore.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(restore, ClusterRestoreFinalizer) {
		controllerutil.AddFinalizer(restore, ClusterRestoreFinalizer)
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !restore.ObjectMeta.DeletionTimestamp.IsZero() {
		// If object is already being deleted from Console API requeue.
		if r.ConsoleClient.IsClusterRestoreDeleting(restore.Status.GetID()) {
			return &requeue
		}

		// Remove Cluster from Console API if it exists.
		if r.ConsoleClient.IsClusterRestoreExisting(restore.Status.GetID()) {
			if _, err := r.ConsoleClient.DeleteClusterRestore(restore.Status.GetID()); err != nil {
				// If it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(restore.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
				return &ctrl.Result{}
			}

			// If deletion process started requeue so that we can make sure provider
			// has been deleted from Console API before removing the finalizer.
			return &requeue
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(restore, ClusterRestoreFinalizer)

		// Stop reconciliation as the item is being deleted.
		return &ctrl.Result{}
	}

	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterRestoreReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.ClusterRestore{}).
		Complete(r)
}
