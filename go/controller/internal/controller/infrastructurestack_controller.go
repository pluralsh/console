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
	"time"

	"github.com/pluralsh/console/go/controller/internal/identity"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/workqueue"
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
	internaltypes "github.com/pluralsh/console/go/controller/internal/types"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	InfrastructureStackFinalizer    = "deployments.plural.sh/stack-protection"
	requeueAfterInfrastructureStack = 2 * time.Minute
)

// InfrastructureStackReconciler reconciles a InfrastructureStack object
type InfrastructureStackReconciler struct {
	client.Client
	Scheme           *runtime.Scheme
	ConsoleClient    consoleclient.ConsoleClient
	CredentialsCache credentials.NamespaceCredentialsCache
	StackQueue       workqueue.TypedRateLimitingInterface[ctrl.Request]
}

// Queue implements the types.Processor interface.
func (r *InfrastructureStackReconciler) Queue() workqueue.TypedRateLimitingInterface[ctrl.Request] {
	return r.StackQueue
}

func (r *InfrastructureStackReconciler) Name() internaltypes.Reconciler {
	return internaltypes.InfrastructureStackReconciler
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=infrastructurestacks,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=infrastructurestacks/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=infrastructurestacks/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop.
func (r *InfrastructureStackReconciler) Reconcile(_ context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.StackQueue.Add(req)
	return ctrl.Result{}, nil
}

// Process implements the types.Processor interface.
func (r *InfrastructureStackReconciler) Process(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	stack := &v1alpha1.InfrastructureStack{}
	if err := r.Get(ctx, req.NamespacedName, stack); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(stack.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	scope, err := NewDefaultScope(ctx, r.Client, stack)
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
		return handleRequeue(result, err, stack.SetCondition)
	}

	repositoryID, result, err := r.handleRepositoryRef(ctx, stack)
	if result != nil || err != nil {
		return handleRequeue(result, err, stack.SetCondition)
	}

	project, result, err := GetProject(ctx, r.Client, r.Scheme, stack)
	if result != nil || err != nil {
		return handleRequeue(result, err, stack.SetCondition)
	}

	stackDefinitionID, result, err := r.handleStackDefinitionRef(ctx, stack)
	if result != nil || err != nil {
		return handleRequeue(result, err, stack.SetCondition)
	}

	metrics, result, err := r.handleObservableMetrics(ctx, stack)
	if result != nil || err != nil {
		return lo.FromPtr(result), err
	}

	attributes := dynamicAttributes{
		clusterID:         clusterID,
		repositoryID:      repositoryID,
		projectID:         project.Status.ID,
		definitionID:      stackDefinitionID,
		observableMetrics: metrics,
	}

	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, stack)
	if err != nil {
		utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if !exists {
		attr, err := r.getStackAttributes(ctx, stack, attributes)
		if err != nil {
			return handleRequeue(nil, err, stack.SetCondition)
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

		logger.Info("created stack", "name", stack.StackName())
		stack.Status.ID = st.ID
		stack.Status.SHA = lo.ToPtr(sha)
		controllerutil.AddFinalizer(stack, InfrastructureStackFinalizer)
	} else {
		attr, err := r.getStackAttributes(ctx, stack, attributes)
		if err != nil {
			return handleRequeue(nil, err, stack.SetCondition)
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

			logger.Info("updated stack", "name", stack.StackName())
			stack.Status.SHA = lo.ToPtr(sha)
		}
	}

	if err := r.setReadyCondition(ctx, stack, exists); err != nil {
		return ctrl.Result{}, err
	}
	utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{RequeueAfter: requeueAfterInfrastructureStack}, nil
}

func (r *InfrastructureStackReconciler) setReadyCondition(ctx context.Context, stack *v1alpha1.InfrastructureStack, exists bool) error {
	if exists {
		utils.MarkCondition(stack.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
		status, err := r.ConsoleClient.GetStackStatus(ctx, *stack.Status.ID)
		if err != nil {
			return err
		}
		if status.Status == console.StackStatusSuccessful {
			utils.MarkCondition(stack.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

		}
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *InfrastructureStackReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                                 // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.InfrastructureStackList))). // Reconcile objects on credentials change.
		For(&v1alpha1.InfrastructureStack{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

func (r *InfrastructureStackReconciler) isAlreadyExists(ctx context.Context, stack *v1alpha1.InfrastructureStack) (bool, error) {
	if !stack.Status.HasID() {
		return false, nil
	}

	_, err := r.ConsoleClient.GetStackById(ctx, stack.Status.GetID())
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
		if stack.Status.GetID() != "" {
			existingNotificationSink, err := r.ConsoleClient.GetStack(ctx, stack.Status.GetID())
			if err != nil && !errors.IsNotFound(err) {
				utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return ctrl.Result{}, err
			}
			if existingNotificationSink != nil && existingNotificationSink.DeletedAt != nil {
				logger.Info("waiting for the stack")
				return requeue(), nil
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
				return requeue(), nil
			}
		}
		controllerutil.RemoveFinalizer(stack, InfrastructureStackFinalizer)
		logger.Info("stack deleted successfully")
	}
	return ctrl.Result{}, nil
}

type dynamicAttributes struct {
	clusterID         string
	repositoryID      string
	projectID         *string
	definitionID      *string
	observableMetrics []console.ObservableMetricAttributes
}

func (r *InfrastructureStackReconciler) getStackAttributes(
	ctx context.Context,
	stack *v1alpha1.InfrastructureStack,
	attributes dynamicAttributes,
) (*console.StackAttributes, error) {
	attr := &console.StackAttributes{
		Name:              stack.StackName(),
		Type:              stack.Spec.Type,
		RepositoryID:      attributes.repositoryID,
		ClusterID:         attributes.clusterID,
		ProjectID:         attributes.projectID,
		DefinitionID:      attributes.definitionID,
		ObservableMetrics: lo.ToSlicePtr(attributes.observableMetrics),
		ManageState:       stack.Spec.ManageState,
		AgentID:           stack.Spec.AgentId,
		Interval:          stack.Spec.Interval,
		Workdir:           stack.Spec.Workdir,
		Git: console.GitRefAttributes{
			Ref:    stack.Spec.Git.Ref,
			Folder: stack.Spec.Git.Folder,
		},
		Configuration: r.stackConfigurationAttributes(stack.Spec.Configuration),
		Approval:      stack.Spec.Approval,
		Files:         make([]*console.StackFileAttributes, 0),
		PolicyEngine:  stack.Spec.PolicyEngine.Attributes(),
	}

	if stack.Spec.ScmConnectionRef != nil {
		connection := &v1alpha1.ScmConnection{}
		if err := r.Get(ctx, types.NamespacedName{Name: stack.Spec.ScmConnectionRef.Name, Namespace: stack.Spec.ScmConnectionRef.Namespace}, connection); err != nil {
			return nil, err
		}
		attr.ConnectionID = connection.Status.ID
	}

	if stack.Spec.Actor != nil {
		userID, err := identity.Cache().GetUserID(*stack.Spec.Actor)
		if err != nil {
			return nil, err
		}
		attr.ActorID = &userID
	}

	if stack.Spec.Cron != nil {
		attr.Cron = &console.StackCronAttributes{
			Crontab:     stack.Spec.Cron.Crontab,
			AutoApprove: stack.Spec.Cron.AutoApprove,
			Overrides:   r.stackOverridesAttributes(stack.Spec.Cron.Overrides),
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
		attr.ReadBindings, err = bindingsAttributes(stack.Spec.Bindings.Read)
		if err != nil {
			return nil, err
		}

		attr.WriteBindings, err = bindingsAttributes(stack.Spec.Bindings.Write)
		if err != nil {
			return nil, err
		}
	}

	if id, ok := stack.GetAnnotations()[InventoryAnnotation]; ok && id != "" {
		attr.ParentID = lo.ToPtr(id)
	}

	if stack.Spec.Tags != nil {
		tags := make([]*console.TagAttributes, 0)
		for name, value := range stack.Spec.Tags {
			tags = append(tags, &console.TagAttributes{Name: name, Value: value})
		}
		attr.Tags = tags
	}

	if stack.Spec.Variables != nil {
		attr.Variables = lo.ToPtr(string(stack.Spec.Variables.Raw))
	}

	return attr, nil
}

func (r *InfrastructureStackReconciler) stackOverridesAttributes(overrides *v1alpha1.StackOverrides) *console.StackOverridesAttributes {
	if overrides == nil {
		return nil
	}

	result := &console.StackOverridesAttributes{}

	if overrides.Terraform != nil {
		result.Terraform = &console.TerraformConfigurationAttributes{
			Parallelism: overrides.Terraform.Parallelism,
			Refresh:     overrides.Terraform.Refresh,
		}
	}

	return result
}

func (r *InfrastructureStackReconciler) stackConfigurationAttributes(conf *v1alpha1.StackConfiguration) *console.StackConfigurationAttributes {
	if conf == nil {
		return &console.StackConfigurationAttributes{}
	}

	attrs := &console.StackConfigurationAttributes{
		Version:    conf.Version,
		Image:      conf.Image,
		Tag:        conf.Tag,
		AiApproval: conf.AiApproval.Attributes(),
	}

	if conf.Terraform != nil {
		attrs.Terraform = &console.TerraformConfigurationAttributes{
			Parallelism: conf.Terraform.Parallelism,
			Refresh:     conf.Terraform.Refresh,
		}
	}

	if conf.Ansible != nil {
		attrs.Ansible = &console.AnsibleConfigurationAttributes{
			Playbook:       conf.Ansible.Playbook,
			Inventory:      conf.Ansible.Inventory,
			AdditionalArgs: conf.Ansible.AdditionalArgs,
		}
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
	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, client.ObjectKey{Name: stack.Spec.ClusterRef.Name, Namespace: stack.Spec.ClusterRef.Namespace}, cluster); err != nil {
		return "", nil, err
	}

	if !cluster.Status.HasID() {
		return "", lo.ToPtr(waitForResources()), fmt.Errorf("cluster is not ready")
	}

	return *cluster.Status.ID, nil, nil
}

// handleRepositoryRef ensures that stack has a repository reference configured and waits for it to be
// ready before allowing main reconcile loop to continue. In case project ref is misconfigured, it will
// return with error and block the reconcile process from continuing.
func (r *InfrastructureStackReconciler) handleRepositoryRef(ctx context.Context, stack *v1alpha1.InfrastructureStack) (string, *ctrl.Result, error) {
	repository := &v1alpha1.GitRepository{}
	if err := r.Get(ctx, client.ObjectKey{Name: stack.Spec.RepositoryRef.Name, Namespace: stack.Spec.RepositoryRef.Namespace}, repository); err != nil {
		return "", nil, err
	}

	if !repository.Status.HasID() {
		return "", lo.ToPtr(waitForResources()), fmt.Errorf("repository is not ready")
	}

	if repository.Status.Health == v1alpha1.GitHealthFailed {
		return "", lo.ToPtr(waitForResources()), fmt.Errorf("repository is not healthy")
	}

	return *repository.Status.ID, nil, nil
}

// handleStackDefinitionRef checks if stack has a stack definition reference configured and waits for it
// to be ready before allowing main reconcile loop to continue. In case stack definition reference is not
// configured, it will return early and allow the reconcile process to continue.
func (r *InfrastructureStackReconciler) handleStackDefinitionRef(ctx context.Context, stack *v1alpha1.InfrastructureStack) (*string, *ctrl.Result, error) {
	if !stack.HasStackDefinitionRef() {
		return nil, nil, nil
	}

	if stack.Spec.Type != console.StackTypeCustom {
		return nil, nil, fmt.Errorf("stack definition reference can only be used when stack type is set to custom, type: %s", stack.Spec.Type)
	}

	stackDefinition := &v1alpha1.StackDefinition{}
	if err := r.Get(ctx, stack.StackDefinitionObjectKey(), stackDefinition); err != nil {
		return nil, nil, err
	}

	if !stackDefinition.Status.HasID() {
		return nil, lo.ToPtr(waitForResources()), fmt.Errorf("stack definition is not ready")
	}

	return stackDefinition.Status.ID, nil, nil
}

// handleObservableMetrics checks if stack has observable metrics configured and waits for observability providers
// to be ready before allowing main reconcile loop to continue. In case observable metrics are not
// configured, it will return early and allow the reconcile process to continue.
func (r *InfrastructureStackReconciler) handleObservableMetrics(
	ctx context.Context,
	stack *v1alpha1.InfrastructureStack,
) ([]console.ObservableMetricAttributes, *ctrl.Result, error) {
	logger := log.FromContext(ctx)
	metrics := make([]console.ObservableMetricAttributes, 0)

	if !stack.HasObservableMetrics() {
		return nil, nil, nil
	}

	for _, om := range stack.Spec.ObservableMetrics {
		obsProvider := &v1alpha1.ObservabilityProvider{}
		key := client.ObjectKey{
			Namespace: om.ObservabilityProviderRef.Namespace,
			Name:      om.ObservabilityProviderRef.Name,
		}

		if err := r.Get(ctx, key, obsProvider); err != nil {
			utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return nil, nil, err
		}

		if !obsProvider.Status.HasID() {
			logger.Info("ObservabilityProvider not ready", "provider", key)
			utils.MarkCondition(stack.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "stack definition is not ready")
			return nil, lo.ToPtr(requeue()), nil
		}

		metrics = append(metrics, console.ObservableMetricAttributes{
			Identifier: om.Identifier,
			ProviderID: *obsProvider.Status.ID,
		})
	}

	return metrics, nil, nil
}
