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
	goerrors "errors"
	"fmt"

	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/yaml"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/cache"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	operrors "github.com/pluralsh/console/go/controller/internal/errors"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	deploymentSettingsName      = "global"
	deploymentSettingsNamespace = "plrl-deploy-operator"
)

// DeploymentSettingsReconciler reconciles a DeploymentSettings object
type DeploymentSettingsReconciler struct {
	client.Client
	Scheme           *runtime.Scheme
	ConsoleClient    consoleclient.ConsoleClient
	CredentialsCache credentials.NamespaceCredentialsCache
	UserGroupCache   cache.UserGroupCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=deploymentsettings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=deploymentsettings/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=deploymentsettings/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *DeploymentSettingsReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	settings := &v1alpha1.DeploymentSettings{}
	if err := r.Get(ctx, req.NamespacedName, settings); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(settings.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	// make sure there is only one CRD object with the `global` name and the agent namespace
	if settings.Name != deploymentSettingsName || settings.Namespace != deploymentSettingsNamespace {
		return ctrl.Result{}, nil
	}
	scope, err := NewDefaultScope(ctx, r.Client, settings)
	if err != nil {
		logger.Error(err, "failed to create deployment settings scope")
		utils.MarkCondition(settings.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
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
	credentials.SyncCredentialsInfo(settings, settings.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(settings.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if !settings.GetDeletionTimestamp().IsZero() {
		return ctrl.Result{}, nil
	}

	ds, err := r.ConsoleClient.GetDeploymentSettings(ctx)
	if err != nil {
		utils.MarkCondition(settings.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	sha, err := utils.HashObject(settings.Spec)
	if err != nil {
		return ctrl.Result{}, err
	}
	if !settings.Status.IsSHAEqual(sha) {
		logger.Info("upsert deployment settings", "name", settings.Name)
		attr, err := r.genDeploymentSettingsAttr(ctx, settings)
		if err != nil {
			utils.MarkCondition(settings.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			if goerrors.Is(err, operrors.ErrRetriable) || goerrors.Is(err, operrors.ErrReferenceNotFound) {
				return requeue, nil
			}
			return ctrl.Result{}, err
		}
		_, err = r.ConsoleClient.UpdateDeploymentSettings(ctx, *attr)
		if err != nil {
			utils.MarkCondition(settings.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		settings.Status.SHA = lo.ToPtr(sha)
	}
	settings.Status.ID = lo.ToPtr(ds.ID)
	utils.MarkCondition(settings.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(settings.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *DeploymentSettingsReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                                // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.DeploymentSettingsList))). // Reconcile objects on credentials change.
		For(&v1alpha1.DeploymentSettings{}).
		Complete(r)
}

func (r *DeploymentSettingsReconciler) genDeploymentSettingsAttr(ctx context.Context, settings *v1alpha1.DeploymentSettings) (*console.DeploymentSettingsAttributes, error) {
	attr := &console.DeploymentSettingsAttributes{
		MgmtRepo: settings.Spec.ManagementRepo,
		Cost:     settings.Spec.Cost.Attributes(),
	}

	if settings.Spec.AgentHelmValues != nil {
		var obj runtime.Object
		if err := runtime.Convert_runtime_RawExtension_To_runtime_Object(settings.Spec.AgentHelmValues, &obj, nil); err != nil {
			return nil, err
		}
		rawHelmValues, err := yaml.Marshal(obj)
		if err != nil {
			return nil, err
		}
		attr.AgentHelmValues = lo.ToPtr(string(rawHelmValues))
	}
	if settings.Spec.PrometheusConnection != nil {
		pc, err := settings.Spec.PrometheusConnection.Attributes(ctx, r.Client, settings.Namespace)
		if err != nil {
			return nil, err
		}
		attr.PrometheusConnection = pc
	}
	if settings.Spec.LokiConnection != nil {
		lc, err := settings.Spec.LokiConnection.Attributes(ctx, r.Client, settings.Namespace)
		if err != nil {
			return nil, err
		}
		attr.LokiConnection = lc
	}
	if settings.Spec.AI != nil {
		ai, err := settings.Spec.AI.Attributes(ctx, r.Client, settings.Namespace)
		if errors.IsNotFound(err) {
			return nil, operrors.ErrReferenceNotFound
		}

		if err != nil {
			return nil, err
		}
		attr.Ai = ai
	}
	if settings.Spec.Logging != nil {
		logging, err := settings.Spec.Logging.Attributes(ctx, r.Client, settings.Namespace)
		if errors.IsNotFound(err) {
			return nil, operrors.ErrReferenceNotFound
		}

		if err != nil {
			return nil, err
		}
		attr.Logging = logging
	}
	if settings.Spec.Stacks != nil {
		var jobSpec *console.GateJobAttributes
		var err error
		var connectionID *string
		if settings.Spec.Stacks.JobSpec != nil {
			jobSpec, err = gateJobAttributes(settings.Spec.Stacks.JobSpec)
			if err != nil {
				return nil, err
			}
		}
		if settings.Spec.Stacks.ConnectionRef != nil {
			connection := &v1alpha1.ScmConnection{}
			if err := r.Get(ctx, types.NamespacedName{Name: settings.Spec.Stacks.ConnectionRef.Name, Namespace: settings.Spec.Stacks.ConnectionRef.Namespace}, connection); err != nil {
				if errors.IsNotFound(err) {
					return nil, operrors.ErrReferenceNotFound
				}
				return nil, err
			}
			connectionID = connection.Status.ID
		}
		attr.Stacks = &console.StackSettingsAttributes{
			JobSpec:      jobSpec,
			ConnectionID: connectionID,
		}
	}
	if settings.Spec.Bindings != nil {
		if err := r.ensure(settings); err != nil {
			return nil, err
		}
		attr.ReadBindings = policyBindings(settings.Spec.Bindings.Read)
		attr.WriteBindings = policyBindings(settings.Spec.Bindings.Write)
		attr.CreateBindings = policyBindings(settings.Spec.Bindings.Create)
		attr.GitBindings = policyBindings(settings.Spec.Bindings.Git)
	}

	if settings.Spec.DeploymentRepositoryRef != nil {
		id, err := getGitRepoID(ctx, r.Client, *settings.Spec.DeploymentRepositoryRef)
		if err != nil {
			if errors.IsNotFound(err) {
				return nil, operrors.ErrReferenceNotFound
			}
			return nil, err
		}
		attr.DeployerRepositoryID = id
	}

	if settings.Spec.ScaffoldsRepositoryRef != nil {
		id, err := getGitRepoID(ctx, r.Client, *settings.Spec.ScaffoldsRepositoryRef)
		if err != nil {
			if errors.IsNotFound(err) {
				return nil, operrors.ErrReferenceNotFound
			}
			return nil, err
		}
		attr.ArtifactRepositoryID = id
	}

	return attr, nil
}

// ensure makes sure that user-friendly input such as userEmail/groupName in
// bindings are transformed into valid IDs on the v1alpha1.Binding object before creation
func (r *DeploymentSettingsReconciler) ensure(settings *v1alpha1.DeploymentSettings) error {
	if settings.Spec.Bindings == nil {
		return nil
	}

	bindings, req, err := ensureBindings(settings.Spec.Bindings.Read, r.UserGroupCache)
	if err != nil {
		return err
	}
	settings.Spec.Bindings.Read = bindings

	bindings, req2, err := ensureBindings(settings.Spec.Bindings.Write, r.UserGroupCache)
	if err != nil {
		return err
	}
	settings.Spec.Bindings.Write = bindings

	bindings, req3, err := ensureBindings(settings.Spec.Bindings.Create, r.UserGroupCache)
	if err != nil {
		return err
	}
	settings.Spec.Bindings.Create = bindings

	bindings, req4, err := ensureBindings(settings.Spec.Bindings.Git, r.UserGroupCache)
	if err != nil {
		return err
	}
	settings.Spec.Bindings.Git = bindings

	if req || req2 || req3 || req4 {
		return operrors.ErrRetriable
	}

	return nil
}
