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

	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/utils"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const InfrastructureStackFinalizer = "deployments.plural.sh/stack-protection"

// InfrastructureStackReconciler reconciles a InfrastructureStack object
type InfrastructureStackReconciler struct {
	client.Client
	Scheme        *runtime.Scheme
	ConsoleClient consoleclient.ConsoleClient
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=infrastructurestacks,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=infrastructurestacks/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=infrastructurestacks/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *InfrastructureStackReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	stack := &v1alpha1.InfrastructureStack{}
	if err := r.Get(ctx, req.NamespacedName, stack); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewInfrastructureStackScope(ctx, r.Client, stack)
	if err != nil {
		logger.Error(err, "failed to create stack")
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()
	if !stack.GetDeletionTimestamp().IsZero() {
		return r.handleDelete(ctx, stack)
	}

	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, client.ObjectKey{Name: stack.Spec.ClusterRef.Name, Namespace: stack.Spec.ClusterRef.Namespace}, cluster); err != nil {
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if cluster.Status.ID == nil {
		logger.Info("Cluster is not ready")
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "cluster is not ready")
		return requeue, nil
	}

	repository := &v1alpha1.GitRepository{}
	if err := r.Get(ctx, client.ObjectKey{Name: stack.Spec.RepositoryRef.Name, Namespace: stack.Spec.RepositoryRef.Namespace}, repository); err != nil {
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if repository.Status.ID == nil {
		logger.Info("Repository is not ready")
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "repository is not ready")
		return requeue, nil
	}
	if repository.Status.Health == v1alpha1.GitHealthFailed {
		logger.Info("Repository is not healthy")
		return requeue, nil
	}

	sha, err := utils.HashObject(stack.Spec)
	if err != nil {
		return ctrl.Result{}, err
	}
	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, stack)
	if err != nil {
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if !exists {
		logger.Info("create stack", "name", stack.StackName())
		attr, err := r.getStackAttributes(ctx, stack, *cluster.Status.ID, *repository.Status.ID)
		if err != nil {
			utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}

		st, err := r.ConsoleClient.CreateStack(ctx, *attr)
		if err != nil {
			utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		stack.Status.ID = st.ID
		stack.Status.SHA = lo.ToPtr(sha)
		controllerutil.AddFinalizer(stack, InfrastructureStackFinalizer)
	}
	if exists && !stack.Status.IsSHAEqual(sha) {
		logger.Info("update stack", "name", stack.StackName())
		attr, err := r.getStackAttributes(ctx, stack, *cluster.Status.ID, *repository.Status.ID)
		if err != nil {
			utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		_, err = r.ConsoleClient.UpdateStack(ctx, stack.Status.GetID(), *attr)
		if err != nil {
			utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}

		stack.Status.SHA = lo.ToPtr(sha)
	}

	utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(stack.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *InfrastructureStackReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.InfrastructureStack{}).
		Complete(r)
}

func (r *InfrastructureStackReconciler) isAlreadyExists(ctx context.Context, stack *v1alpha1.InfrastructureStack) (bool, error) {
	if !stack.Status.HasID() {
		return false, nil
	}

	_, err := r.ConsoleClient.GetStack(ctx, stack.Status.GetID())
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func (r *InfrastructureStackReconciler) handleDelete(ctx context.Context, stack *v1alpha1.InfrastructureStack) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	if controllerutil.ContainsFinalizer(stack, InfrastructureStackFinalizer) {
		logger.Info("try to delete stack")
		if stack.Status.GetID() != "" {
			existingNotificationSink, err := r.ConsoleClient.GetStack(ctx, stack.Status.GetID())
			if err != nil && !errors.IsNotFound(err) {
				utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return ctrl.Result{}, err
			}
			if existingNotificationSink != nil && existingNotificationSink.DeletedAt != nil {
				logger.Info("waiting for the stack")
				return requeue, nil
			}
			if existingNotificationSink != nil {
				if stack.Spec.Detach {
					if err := r.ConsoleClient.DetachStack(ctx, *stack.Status.ID); err != nil {
						utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
						return ctrl.Result{}, err
					}
				} else {
					if err := r.ConsoleClient.DeleteStack(ctx, *stack.Status.ID); err != nil {
						utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
						return ctrl.Result{}, err
					}
				}
				return requeue, nil
			}
		}
		controllerutil.RemoveFinalizer(stack, InfrastructureStackFinalizer)
		logger.Info("stack deleted successfully")
	}
	return ctrl.Result{}, nil
}

func (r *InfrastructureStackReconciler) getStackAttributes(ctx context.Context, stack *v1alpha1.InfrastructureStack, clusterID, repositoryID string) (*console.StackAttributes, error) {
	attr := &console.StackAttributes{
		Name:         stack.StackName(),
		Type:         stack.Spec.Type,
		RepositoryID: repositoryID,
		ClusterID:    clusterID,
		Git: console.GitRefAttributes{
			Ref:    stack.Spec.Git.Ref,
			Folder: stack.Spec.Git.Folder,
		},
		Configuration: console.StackConfigurationAttributes{
			Version: stack.Spec.Configuration.Version,
			Image:   stack.Spec.Configuration.Image,
		},
		Approval: stack.Spec.Approval,
		Files:    make([]*console.StackFileAttributes, 0),
	}

	if stack.Spec.Files != nil {
		configMap := &corev1.ConfigMap{}
		name := types.NamespacedName{Name: stack.Spec.Files.Name, Namespace: stack.GetNamespace()}
		if err := r.Get(ctx, name, configMap); err != nil {
			return nil, err
		}
		for k, v := range configMap.Data {
			attr.Files = append(attr.Files, &console.StackFileAttributes{
				Path:    k,
				Content: v,
			})
		}

	}

	attr.Environment = algorithms.Map(stack.Spec.Environment,
		func(b v1alpha1.StackEnvironment) *console.StackEnvironmentAttributes {
			return &console.StackEnvironmentAttributes{
				Name:   b.Name,
				Value:  b.Value,
				Secret: b.Secret,
			}
		})

	if stack.Spec.JobSpec != nil {
		raw, err := json.Marshal(stack.Spec.JobSpec)
		if err != nil {
			return nil, err
		}
		containers := []*console.ContainerAttributes{}
		for _, c := range stack.Spec.JobSpec.Template.Spec.Containers {
			ca := &console.ContainerAttributes{
				Image: c.Image,
			}
			if c.Args != nil {
				ca.Args = algorithms.Map(c.Args,
					func(b string) *string { return &b })
			}
			if c.Env != nil {
				ca.Env = algorithms.Map(c.Env,
					func(b corev1.EnvVar) *console.EnvAttributes {
						return &console.EnvAttributes{
							Name:  b.Name,
							Value: b.Value,
						}
					})
			}
			if c.EnvFrom != nil {
				ca.EnvFrom = algorithms.Map(c.EnvFrom,
					func(b corev1.EnvFromSource) *console.EnvFromAttributes {
						secret := ""
						configMap := ""
						if b.SecretRef != nil {
							secret = b.SecretRef.Name
						}
						if b.ConfigMapRef != nil {
							configMap = b.ConfigMapRef.Name
						}
						return &console.EnvFromAttributes{
							Secret:    secret,
							ConfigMap: configMap,
						}
					})
			}

			containers = append(containers, ca)
		}

		var annotations *string
		var labels *string
		if stack.Spec.JobSpec.Template.Annotations != nil {
			result, err := json.Marshal(stack.Spec.JobSpec.Template.Annotations)
			if err != nil {
				return nil, err
			}
			rawAnnotations := string(result)
			annotations = &rawAnnotations
		}
		if stack.Spec.JobSpec.Template.Labels != nil {
			result, err := json.Marshal(stack.Spec.JobSpec.Template.Labels)
			if err != nil {
				return nil, err
			}
			rawLabels := string(result)
			labels = &rawLabels
		}
		namespace := stack.Namespace
		if stack.Spec.JobSpec.Template.Namespace != "" {
			namespace = stack.Spec.JobSpec.Template.Namespace
		}

		attr.JobSpec = &console.GateJobAttributes{
			Namespace:      namespace,
			Raw:            lo.ToPtr(string(raw)),
			Containers:     containers,
			ServiceAccount: lo.ToPtr(stack.Spec.JobSpec.Template.Spec.ServiceAccountName),
			Labels:         labels,
			Annotations:    annotations,
		}
	}

	if stack.Spec.Bindings != nil {
		attr.ReadBindings = make([]*console.PolicyBindingAttributes, 0)
		attr.WriteBindings = make([]*console.PolicyBindingAttributes, 0)
		attr.ReadBindings = algorithms.Map(stack.Spec.Bindings.Read,
			func(b v1alpha1.Binding) *console.PolicyBindingAttributes { return b.Attributes() })
		attr.WriteBindings = algorithms.Map(stack.Spec.Bindings.Write,
			func(b v1alpha1.Binding) *console.PolicyBindingAttributes { return b.Attributes() })
	}

	return attr, nil
}
