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
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/json"
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
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const ManagedNamespaceFinalizer = "deployments.plural.sh/managed-namespace-protection"

// ManagedNamespaceReconciler reconciles a ManagedNamespace object
type ManagedNamespaceReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=managednamespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=managednamespaces/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=managednamespaces/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *ManagedNamespaceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	managedNamespace := &v1alpha1.ManagedNamespace{}
	if err := r.Get(ctx, req.NamespacedName, managedNamespace); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, r.Client, managedNamespace)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	utils.MarkCondition(managedNamespace.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := r.ConsoleClient.UseCredentials(req.Namespace, r.CredentialsCache)
	credentials.SyncCredentialsInfo(managedNamespace, managedNamespace.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(managedNamespace.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if !managedNamespace.GetDeletionTimestamp().IsZero() {
		return ctrl.Result{}, r.handleDelete(ctx, managedNamespace)
	}

	sha, err := utils.HashObject(managedNamespace.Spec)
	if err != nil {
		return ctrl.Result{}, err
	}
	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, managedNamespace)
	if err != nil {
		utils.MarkCondition(managedNamespace.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if !exists {
		logger.Info("create managed namespace", "name", managedNamespace.Name)
		attr, res, err := r.getNamespaceAttributes(ctx, managedNamespace)
		if res != nil || err != nil {
			return common.HandleRequeue(res, err, managedNamespace.SetCondition)
		}

		ns, err := r.ConsoleClient.CreateNamespace(ctx, *attr)
		if err != nil {
			utils.MarkCondition(managedNamespace.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		managedNamespace.Status.ID = lo.ToPtr(ns.ID)
		managedNamespace.Status.SHA = lo.ToPtr(sha)
		controllerutil.AddFinalizer(managedNamespace, ManagedNamespaceFinalizer)
	}
	if exists && !managedNamespace.Status.IsSHAEqual(sha) {
		logger.Info("update managed namespace", "name", managedNamespace.Name)
		attr, res, err := r.getNamespaceAttributes(ctx, managedNamespace)
		if res != nil || err != nil {
			return common.HandleRequeue(res, err, managedNamespace.SetCondition)
		}

		if !managedNamespace.Status.HasID() {
			existing, err := r.ConsoleClient.GetNamespaceByName(ctx, managedNamespace.NamespaceName())
			if err != nil {
				utils.MarkCondition(managedNamespace.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return managedNamespace.Spec.Reconciliation.Requeue(), err
			}
			managedNamespace.Status.ID = lo.ToPtr(existing.ID)
		}

		_, err = r.ConsoleClient.UpdateNamespace(ctx, managedNamespace.Status.GetID(), *attr)
		if err != nil {
			utils.MarkCondition(managedNamespace.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}

		managedNamespace.Status.SHA = lo.ToPtr(sha)
	}

	utils.MarkCondition(managedNamespace.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(managedNamespace.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ManagedNamespaceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                              // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.ManagedNamespaceList))). // Reconcile objects on credentials change.
		For(&v1alpha1.ManagedNamespace{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

func (r *ManagedNamespaceReconciler) handleDelete(ctx context.Context, namespace *v1alpha1.ManagedNamespace) error {
	if controllerutil.ContainsFinalizer(namespace, ManagedNamespaceFinalizer) {
		if namespace.Status.GetID() != "" {
			existingNotificationSink, err := r.ConsoleClient.GetNamespace(ctx, namespace.Status.GetID())
			if err != nil && !errors.IsNotFound(err) {
				utils.MarkCondition(namespace.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return err
			}
			if existingNotificationSink != nil {
				if err := r.ConsoleClient.DeleteNamespace(ctx, *namespace.Status.ID); err != nil {
					utils.MarkCondition(namespace.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
					return err
				}
			}
		}
		controllerutil.RemoveFinalizer(namespace, ManagedNamespaceFinalizer)
	}
	return nil
}

func (r *ManagedNamespaceReconciler) isAlreadyExists(ctx context.Context, namespace *v1alpha1.ManagedNamespace) (bool, error) {
	if !namespace.Status.HasID() {
		return false, nil
	}

	_, err := r.ConsoleClient.GetNamespaceByName(ctx, namespace.NamespaceName())
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func (r *ManagedNamespaceReconciler) getNamespaceAttributes(ctx context.Context, ns *v1alpha1.ManagedNamespace) (*console.ManagedNamespaceAttributes, *ctrl.Result, error) {
	attr := &console.ManagedNamespaceAttributes{
		Name:        ns.NamespaceName(),
		Namespace:   ns.Spec.Name,
		Description: ns.Spec.Description,
	}

	if id, ok := ns.GetAnnotations()[InventoryAnnotation]; ok && id != "" {
		attr.ParentID = lo.ToPtr(id)
	}

	if ns.Spec.Cascade != nil {
		attr.Cascade = &console.CascadeAttributes{
			Delete: ns.Spec.Cascade.Delete,
			Detach: ns.Spec.Cascade.Detach,
		}
	}

	if ns.Spec.Target != nil {
		attr.Target = &console.ClusterTargetAttributes{
			Distro: ns.Spec.Target.Distro,
		}
		if ns.Spec.Target.Tags != nil {
			result, err := json.Marshal(ns.Spec.Target.Tags)
			if err != nil {
				return nil, nil, err
			}
			rawTags := string(result)
			attr.Target.Tags = &rawTags
		}
	}

	if ns.Spec.Annotations != nil {
		result, err := json.Marshal(ns.Spec.Annotations)
		if err != nil {
			return nil, nil, err
		}
		rawAnnotations := string(result)
		attr.Annotations = &rawAnnotations
	}
	if ns.Spec.Labels != nil {
		result, err := json.Marshal(ns.Spec.Labels)
		if err != nil {
			return nil, nil, err
		}
		rawLabels := string(result)
		attr.Labels = &rawLabels
	}
	if ns.Spec.PullSecrets != nil {
		attr.PullSecrets = make([]*string, 0)
		attr.PullSecrets = algorithms.Map(ns.Spec.PullSecrets,
			func(b string) *string { return &b })
	}
	if ns.Spec.Service != nil {
		srv := ns.Spec.Service
		repository, result, err := r.getRepository(ctx, ns)
		if result != nil || err != nil {
			return nil, result, err
		}

		namespace := ns.GetNamespace()
		st, err := common.ServiceTemplateAttributes(ctx, r.Client, namespace, srv, repository.Status.ID)
		if err != nil {
			return nil, nil, err
		}

		if st.Name == nil {
			st.Name = lo.ToPtr(ns.GetName())
		}

		if st.Namespace == nil {
			st.Namespace = lo.ToPtr(ns.GetNamespace())
		}

		attr.Service = st
	}

	project, result, err := common.Project(ctx, r.Client, r.Scheme, ns)
	if result != nil || err != nil {
		return nil, result, err
	}
	attr.ProjectID = project.Status.ID

	return attr, nil, nil
}

func (r *ManagedNamespaceReconciler) getRepository(ctx context.Context, ns *v1alpha1.ManagedNamespace) (*v1alpha1.GitRepository, *ctrl.Result, error) {
	repository := &v1alpha1.GitRepository{}
	if ns.Spec.Service.RepositoryRef != nil {
		if err := r.Get(ctx, client.ObjectKey{Name: ns.Spec.Service.RepositoryRef.Name, Namespace: ns.Spec.Service.RepositoryRef.Namespace}, repository); err != nil {
			return nil, nil, err
		}

		if !repository.Status.HasID() {
			return nil, lo.ToPtr(common.Wait()), fmt.Errorf("repository is not ready")
		}

		if repository.Status.Health == v1alpha1.GitHealthFailed {
			return nil, nil, fmt.Errorf("repository %s is not healthy", repository.Name)
		}
	}
	return repository, nil, nil
}
