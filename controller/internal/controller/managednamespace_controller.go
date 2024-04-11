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
	"encoding/json"
	"fmt"

	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/api/v1alpha1"
	deploymentsv1alpha1 "github.com/pluralsh/console/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/utils"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const ManagedNamespaceFinalizer = "deployments.plural.sh/managed-namespace-protection"

// ManagedNamespaceReconciler reconciles a ManagedNamespace object
type ManagedNamespaceReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=managednamespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=managednamespaces/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=managednamespaces/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *ManagedNamespaceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	managedNamespace := &v1alpha1.ManagedNamespace{}
	if err := r.Get(ctx, req.NamespacedName, managedNamespace); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewManagedNamespaceScope(ctx, r.Client, managedNamespace)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(managedNamespace.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()
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
		attr, err := r.getNamespaceAttributes(ctx, managedNamespace)
		if err != nil {
			utils.MarkCondition(managedNamespace.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
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
		attr, err := r.getNamespaceAttributes(ctx, managedNamespace)
		if err != nil {
			utils.MarkCondition(managedNamespace.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
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
		For(&deploymentsv1alpha1.ManagedNamespace{}).
		Complete(r)
}

func (r *ManagedNamespaceReconciler) handleDelete(ctx context.Context, namespace *deploymentsv1alpha1.ManagedNamespace) error {
	logger := log.FromContext(ctx)
	if controllerutil.ContainsFinalizer(namespace, ManagedNamespaceFinalizer) {
		logger.Info("try to delete namespace")
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
		logger.Info("namespace deleted successfully")
	}
	return nil
}

func (r *ManagedNamespaceReconciler) isAlreadyExists(ctx context.Context, namespace *deploymentsv1alpha1.ManagedNamespace) (bool, error) {
	if !namespace.Status.HasID() {
		return false, nil
	}

	_, err := r.ConsoleClient.GetNamespace(ctx, namespace.Status.GetID())
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func (r *ManagedNamespaceReconciler) getNamespaceAttributes(ctx context.Context, ns *v1alpha1.ManagedNamespace) (*console.ManagedNamespaceAttributes, error) {
	attr := &console.ManagedNamespaceAttributes{
		Name:        ns.NamespaceName(),
		Description: ns.Spec.Description,
	}
	if ns.Spec.Target != nil {
		attr.Target = &console.ClusterTargetAttributes{
			Distro: ns.Spec.Target.Distro,
		}
		if ns.Spec.Target.Tags != nil {
			result, err := json.Marshal(ns.Spec.Target.Tags)
			if err != nil {
				return nil, err
			}
			rawTags := string(result)
			attr.Target.Tags = &rawTags
		}
	}

	if ns.Spec.Annotations != nil {
		result, err := json.Marshal(ns.Spec.Annotations)
		if err != nil {
			return nil, err
		}
		rawAnnotations := string(result)
		attr.Annotations = &rawAnnotations
	}
	if ns.Spec.Labels != nil {
		result, err := json.Marshal(ns.Spec.Labels)
		if err != nil {
			return nil, err
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
		repository, err := r.getRepository(ctx, ns)
		if err != nil {
			return nil, err
		}
		namespace := ns.GetNamespace()
		st, err := genServiceTemplate(ctx, r.Client, namespace, srv, repository.Status.ID)
		if err != nil {
			return nil, err
		}
		attr.Service = st
	}

	return attr, nil
}

func (r *ManagedNamespaceReconciler) getRepository(ctx context.Context, ns *v1alpha1.ManagedNamespace) (*v1alpha1.GitRepository, error) {
	repository := &v1alpha1.GitRepository{}
	if ns.Spec.Service.RepositoryRef != nil {
		if err := r.Get(ctx, client.ObjectKey{Name: ns.Spec.Service.RepositoryRef.Name, Namespace: ns.Spec.Service.RepositoryRef.Namespace}, repository); err != nil {
			return nil, err
		}
		if repository.Status.ID == nil {
			return nil, fmt.Errorf("repository %s is not ready", repository.Name)
		}
		if repository.Status.Health == v1alpha1.GitHealthFailed {
			return nil, fmt.Errorf("repository %s is not healthy", repository.Name)
		}
	}
	return repository, nil
}
