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
	"github.com/pluralsh/polly/algorithms"
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
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/pluralsh/console/controller/internal/cache"
	"github.com/pluralsh/console/controller/internal/credentials"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/utils"
)

const InfrastructureStackFinalizer = "deployments.plural.sh/stack-protection"

// InfrastructureStackReconciler reconciles a InfrastructureStack object
type InfrastructureStackReconciler struct {
	client.Client
	Scheme           *runtime.Scheme
	ConsoleClient    consoleclient.ConsoleClient
	UserGroupCache   cache.UserGroupCache
	CredentialsCache credentials.NamespaceCredentialsCache
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

	logger.Info("reconciling InfrastructureStack", "namespacename", req.NamespacedName)
	utils.MarkCondition(stack.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
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

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := r.ConsoleClient.UseCredentials(req.Namespace, r.CredentialsCache)
	credentials.SyncCredentialsInfo(stack, stack.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if !stack.GetDeletionTimestamp().IsZero() {
		return r.handleDelete(ctx, stack)
	}

	clusterID, result, err := r.handleClusterRef(ctx, stack)
	if result != nil || err != nil {
		return lo.FromPtr(result), err
	}

	repositoryID, result, err := r.handleRepositoryRef(ctx, stack)
	if result != nil || err != nil {
		return lo.FromPtr(result), err
	}

	projectID, result, err := r.handleProjectRef(ctx, stack)
	if result != nil || err != nil {
		return lo.FromPtr(result), err
	}

	stackDefinitionID, result, err := r.handleStackDefinitionRef(ctx, stack)
	if result != nil || err != nil {
		return lo.FromPtr(result), err
	}

	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, stack)
	if err != nil {
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if !exists {
		logger.Info("create stack", "name", stack.StackName())
		attr, err := r.getStackAttributes(ctx, stack, clusterID, repositoryID, projectID, stackDefinitionID)
		if err != nil {
			utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}

		sha, err := utils.HashObject(attr)
		if err != nil {
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
	} else {
		logger.Info("update stack", "name", stack.StackName())
		attr, err := r.getStackAttributes(ctx, stack, clusterID, repositoryID, projectID, stackDefinitionID)
		if err != nil {
			utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}

		sha, err := utils.HashObject(attr)
		if err != nil {
			return ctrl.Result{}, err
		}

		if !stack.Status.IsSHAEqual(sha) {
			_, err = r.ConsoleClient.UpdateStack(ctx, stack.Status.GetID(), *attr)
			if err != nil {
				utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return ctrl.Result{}, err
			}

			stack.Status.SHA = lo.ToPtr(sha)
		}
	}

	utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(stack.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *InfrastructureStackReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                                 // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.InfrastructureStackList))). // Reconcile objects on credentials change.
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

func (r *InfrastructureStackReconciler) getStackAttributes(
	ctx context.Context,
	stack *v1alpha1.InfrastructureStack,
	clusterID, repositoryID string,
	projectID, definitionID *string,
) (*console.StackAttributes, error) {
	attr := &console.StackAttributes{
		Name:         stack.StackName(),
		Type:         stack.Spec.Type,
		RepositoryID: repositoryID,
		ClusterID:    clusterID,
		ProjectID:    projectID,
		DefinitionID: definitionID,
		ManageState:  stack.Spec.ManageState,
		Workdir:      stack.Spec.Workdir,
		Git: console.GitRefAttributes{
			Ref:    stack.Spec.Git.Ref,
			Folder: stack.Spec.Git.Folder,
		},
		Configuration: r.stackConfigurationAttributes(stack.Spec.Configuration),
		Approval:      stack.Spec.Approval,
		Files:         make([]*console.StackFileAttributes, 0),
	}

	if stack.Spec.ScmConnectionRef != nil {
		connection := &v1alpha1.ScmConnection{}
		if err := r.Get(ctx, types.NamespacedName{Name: stack.Spec.ScmConnectionRef.Name, Namespace: stack.Spec.ScmConnectionRef.Namespace}, connection); err != nil {
			return nil, err
		}
		attr.ConnectionID = connection.Status.ID
	}

	if stack.Spec.Actor != nil {
		userID, err := r.UserGroupCache.GetUserID(*stack.Spec.Actor)
		if err != nil {
			return nil, err
		}
		attr.ActorID = &userID
	}

	if stack.Spec.Cron != nil {
		attr.Cron = &console.StackCronAttributes{
			Crontab:     stack.Spec.Cron.Crontab,
			AutoApprove: stack.Spec.Cron.AutoApprove,
		}
	}

	for _, file := range stack.Spec.Files {
		secret := &corev1.Secret{}
		name := types.NamespacedName{Name: file.SecretRef.Name, Namespace: stack.GetNamespace()}
		if err := r.Get(ctx, name, secret); err != nil {
			return nil, err
		}
		for k, v := range secret.Data {
			attr.Files = append(attr.Files, &console.StackFileAttributes{
				Path:    fmt.Sprintf("%s/%s", file.MountPath, k),
				Content: string(v),
			})
		}
	}

	for _, env := range stack.Spec.Environment {
		var isSecret *bool
		var value string

		if env.Value != nil {
			value = *env.Value
		} else if env.SecretKeyRef != nil {
			secret := &corev1.Secret{}
			name := types.NamespacedName{Name: env.SecretKeyRef.Name, Namespace: stack.GetNamespace()}
			if err := r.Get(ctx, name, secret); err != nil {
				return nil, err
			}
			// if err := utils.TryAddControllerRef(ctx, r.Client, stack, secret, r.Scheme); err != nil {
			// 	return nil, err
			// }
			isSecret = lo.ToPtr(true)
			rawData, ok := secret.Data[env.SecretKeyRef.Key]
			if !ok {
				return nil, fmt.Errorf("can not find secret data for the key %s", env.SecretKeyRef.Key)
			}
			value = string(rawData)
		} else if env.ConfigMapRef != nil {
			configMap := &corev1.ConfigMap{}
			name := types.NamespacedName{Name: env.ConfigMapRef.Name, Namespace: stack.GetNamespace()}
			if err := r.Get(ctx, name, configMap); err != nil {
				return nil, err
			}
			// if err := utils.TryAddControllerRef(ctx, r.Client, stack, configMap, r.Scheme); err != nil {
			// 	return nil, err
			// }
			rawData, ok := configMap.Data[env.ConfigMapRef.Key]
			if !ok {
				return nil, fmt.Errorf("can not find secret data for the key %s", env.ConfigMapRef.Key)
			}
			value = rawData
		}

		attr.Environment = append(attr.Environment, &console.StackEnvironmentAttributes{
			Name:   env.Name,
			Value:  value,
			Secret: isSecret,
		})
	}

	jobSpec, err := gateJobAttributes(stack.Spec.JobSpec)
	if err != nil {
		return nil, err
	}
	attr.JobSpec = jobSpec

	if stack.Spec.Bindings != nil {
		attr.ReadBindings = policyBindings(stack.Spec.Bindings.Read)
		attr.WriteBindings = policyBindings(stack.Spec.Bindings.Write)
	}

	return attr, nil
}

func (r *InfrastructureStackReconciler) stackConfigurationAttributes(conf v1alpha1.StackConfiguration) console.StackConfigurationAttributes {
	attrs := console.StackConfigurationAttributes{
		Version: lo.ToPtr(conf.Version),
		Image:   conf.Image,
	}

	if conf.Hooks != nil {
		attrs.Hooks = algorithms.Map(conf.Hooks, func(h *v1alpha1.StackHook) *console.StackHookAttributes {
			return &console.StackHookAttributes{Cmd: h.Cmd, Args: lo.ToSlicePtr(h.Args), AfterStage: h.AfterStage}
		})
	}

	return attrs
}

// handleClusterRef ensures that stack has a cluster reference configured and waits for it to be
// ready before allowing main reconcile loop to continue. In case cluster reference is misconfigured,
// it will return with error and block the reconcile process from continuing.
func (r *InfrastructureStackReconciler) handleClusterRef(ctx context.Context, stack *v1alpha1.InfrastructureStack) (string, *ctrl.Result, error) {
	logger := log.FromContext(ctx)
	cluster := &v1alpha1.Cluster{}

	if err := r.Get(ctx, client.ObjectKey{Name: stack.Spec.ClusterRef.Name, Namespace: stack.Spec.ClusterRef.Namespace}, cluster); err != nil {
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return "", &ctrl.Result{}, err
	}

	if cluster.Status.ID == nil {
		logger.Info("Cluster is not ready")
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "cluster is not ready")
		return "", &requeue, nil
	}

	return *cluster.Status.ID, nil, nil
}

// handleRepositoryRef ensures that stack has a repository reference configured and waits for it to be
// ready before allowing main reconcile loop to continue. In case project ref is misconfigured, it will
// return with error and block the reconcile process from continuing.
func (r *InfrastructureStackReconciler) handleRepositoryRef(ctx context.Context, stack *v1alpha1.InfrastructureStack) (string, *ctrl.Result, error) {
	logger := log.FromContext(ctx)
	repository := &v1alpha1.GitRepository{}

	if err := r.Get(ctx, client.ObjectKey{Name: stack.Spec.RepositoryRef.Name, Namespace: stack.Spec.RepositoryRef.Namespace}, repository); err != nil {
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return "", &ctrl.Result{}, err
	}

	if repository.Status.ID == nil {
		logger.Info("Repository is not ready")
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "repository is not ready")
		return "", &requeue, nil
	}

	if repository.Status.Health == v1alpha1.GitHealthFailed {
		logger.Info("Repository is not healthy")
		return "", &requeue, nil
	}

	return *repository.Status.ID, nil, nil
}

// handleProjectRef checks is stack has a project reference configured and waits for it to be ready before allowing
// main reconcile loop to continue. In case project reference is not configured, it will return early and allow the
// reconcile process to continue.
func (r *InfrastructureStackReconciler) handleProjectRef(ctx context.Context, stack *v1alpha1.InfrastructureStack) (*string, *ctrl.Result, error) {
	logger := log.FromContext(ctx)
	project := &v1alpha1.Project{}

	if !stack.HasProjectRef() {
		return nil, nil, nil
	}

	if err := r.Get(ctx, client.ObjectKey{Name: stack.ProjectName()}, project); err != nil {
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return nil, &requeue, err
	}

	if project.Status.ID == nil {
		logger.Info("Project is not ready")
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "project is not ready")
		return nil, &requeue, nil
	}

	if err := controllerutil.SetOwnerReference(project, stack, r.Scheme); err != nil {
		return nil, &requeue, fmt.Errorf("could not set stack owner reference, got error: %+v", err)
	}

	return project.Status.ID, nil, nil
}

// handleStackDefinitionRef checks is stack has a stack definition reference configured and waits for it
// to be ready before allowing main reconcile loop to continue. In case stack definition reference is not
// configured, it will return early and allow the reconcile process to continue.
func (r *InfrastructureStackReconciler) handleStackDefinitionRef(ctx context.Context, stack *v1alpha1.InfrastructureStack) (*string, *ctrl.Result, error) {
	logger := log.FromContext(ctx)
	stackDefinition := &v1alpha1.StackDefinition{}

	if !stack.HasStackDefinitionRef() {
		return nil, nil, nil
	}

	if stack.HasStackDefinitionRef() && stack.Spec.Type != console.StackTypeCustom {
		return nil, nil, fmt.Errorf("stack definition reference can only be used when stack type is set to custom, type: %s", stack.Spec.Type)
	}

	if err := r.Get(ctx, stack.StackDefinitionObjectKey(), stackDefinition); err != nil {
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return nil, nil, err
	}

	if stackDefinition.Status.ID == nil {
		logger.Info("StackDefinition is not ready")
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "stack definition is not ready")
		return nil, &requeue, nil
	}

	return stackDefinition.Status.ID, nil, nil
}
