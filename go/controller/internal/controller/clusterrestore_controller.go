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
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

// ClusterRestoreReconciler reconciles a ClusterRestore object
type ClusterRestoreReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clusterrestores,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clusterrestores/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=clusterrestores/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *ClusterRestoreReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	restore := &v1alpha1.ClusterRestore{}
	if err := r.Get(ctx, req.NamespacedName, restore); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewDefaultScope(ctx, r.Client, restore)
	if err != nil {
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	utils.MarkCondition(restore.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := r.ConsoleClient.UseCredentials(req.Namespace, r.CredentialsCache)
	credentials.SyncCredentialsInfo(restore, restore.SetCondition, nc, err)
	if err != nil {
		return handleRequeue(nil, err, restore.SetCondition)
	}

	// Handle resource deletion both in the Kubernetes cluster and in the Console.
	if !restore.GetDeletionTimestamp().IsZero() {
		utils.MarkCondition(restore.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse,
			v1alpha1.ReadyConditionReasonDeleting, "")
		utils.MarkCondition(restore.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse,
			v1alpha1.SynchronizedConditionReasonDeleting, "")
		return ctrl.Result{}, nil
	}

	// Sync resource with the Console.
	apiRestore, result, err := r.sync(ctx, restore)
	if result != nil || err != nil {
		return handleRequeue(result, err, restore.SetCondition)
	}

	// Update resource status.
	restore.Status.ID = &apiRestore.ID
	restore.Status.Status = apiRestore.Status
	if apiRestore.Status == console.RestoreStatusSuccessful {
		utils.MarkCondition(restore.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue,
			v1alpha1.ReadyConditionReason, "")
	} else {
		utils.MarkCondition(restore.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse,
			v1alpha1.ReadyConditionReason, fmt.Sprintf("Restore has %s status", apiRestore.Status))
	}
	utils.MarkCondition(restore.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return restore.Spec.Reconciliation.Requeue(), nil
}

func (r *ClusterRestoreReconciler) sync(ctx context.Context, restore *v1alpha1.ClusterRestore) (*console.ClusterRestoreFragment, *ctrl.Result, error) {
	exists, err := r.ConsoleClient.IsClusterRestoreExisting(ctx, restore.Status.GetID())
	if err != nil {
		return nil, nil, err
	}

	if exists {
		apiRestore, err := r.ConsoleClient.GetClusterRestore(ctx, restore.Status.GetID())
		return apiRestore, nil, err
	}

	var backupID string
	if restore.Spec.HasBackupID() {
		backupID = restore.Spec.GetBackupID()
	} else {
		helper := utils.NewConsoleHelper(ctx, r.Client)
		clusterID, err := helper.IDFromRef(restore.Spec.BackupClusterRef, &v1alpha1.Cluster{})
		if err != nil {
			return nil, nil, err
		}

		if clusterID == nil {
			return nil, lo.ToPtr(wait()), fmt.Errorf("cluster is not ready")
		}

		backup, err := r.ConsoleClient.GetClusterBackup(clusterID, restore.Spec.BackupNamespace, restore.Spec.BackupName)
		if err != nil {
			return nil, nil, err
		}
		backupID = backup.ID
	}

	apiRestore, err := r.ConsoleClient.CreateClusterRestore(ctx, backupID)
	return apiRestore, nil, err
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterRestoreReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                            // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.ClusterRestoreList))). // Reconcile objects on credentials change.
		For(&v1alpha1.ClusterRestore{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
