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
	"github.com/pluralsh/console/controller/internal/credentials"
	"github.com/pluralsh/console/controller/internal/utils"
	"github.com/samber/lo"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/yaml"
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

	// make sure there is only one CRD object with the `global` name and the agent namespace
	if settings.Name != deploymentSettingsName || settings.Namespace != deploymentSettingsNamespace {
		return ctrl.Result{}, nil
	}

	scope, err := NewDeploymentSettingsScope(ctx, r.Client, settings)
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
	utils.SyncCredentialsInfo(settings, settings.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(settings.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if !settings.GetDeletionTimestamp().IsZero() {
		logger.Info("deployment settings CRD deleted successfully")
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
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                          // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, utils.OnCredentialsChange(r.Client, new(v1alpha1.DeploymentSettingsList))). // Reconcile objects on credentials change.
		For(&v1alpha1.DeploymentSettings{}).
		Complete(r)
}

func (r *DeploymentSettingsReconciler) genDeploymentSettingsAttr(ctx context.Context, settings *v1alpha1.DeploymentSettings) (*console.DeploymentSettingsAttributes, error) {
	attr := &console.DeploymentSettingsAttributes{}
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
		attr.PrometheusConnection = settings.Spec.PrometheusConnection.Attributes()
	}
	if settings.Spec.LokiConnection != nil {
		attr.LokiConnection = settings.Spec.LokiConnection.Attributes()
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
		attr.ReadBindings = policyBindings(settings.Spec.Bindings.Read)
		attr.WriteBindings = policyBindings(settings.Spec.Bindings.Write)
		attr.CreateBindings = policyBindings(settings.Spec.Bindings.Create)
		attr.GitBindings = policyBindings(settings.Spec.Bindings.Git)
	}
	return attr, nil
}
