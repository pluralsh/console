package types

import (
	"fmt"

	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/pluralsh/console/go/controller/internal/cache"
	"github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/controller"
	"github.com/pluralsh/console/go/controller/internal/credentials"
)

// Reconciler is a name of reconciler supported by this controller.
type Reconciler string

const (
	GitRepositoryReconciler         Reconciler = "gitrepository"
	HelmRepositoryReconciler        Reconciler = "helmrepository"
	ServiceDeploymentReconciler     Reconciler = "servicedeployment"
	ClusterReconciler               Reconciler = "cluster"
	ClusterRestoreReconciler        Reconciler = "clusterrestore"
	ProviderReconciler              Reconciler = "provider"
	GlobalServiceReconciler         Reconciler = "globalservice"
	PipelineReconciler              Reconciler = "pipeline"
	ScmConnectionReconciler         Reconciler = "scmconnection"
	ServiceAccountReconciler        Reconciler = "serviceaccount"
	PrAutomationReconciler          Reconciler = "prautomation"
	PipelineContextReconciler       Reconciler = "pipelinecontext"
	ClusterRestoreTriggerReconciler Reconciler = "restoretrigger"
	PrAutomationTriggerReconciler   Reconciler = "prautomationtrigger"
	NotificationSinkReconciler      Reconciler = "notificationsink"
	NotificationRouterReconciler    Reconciler = "notificationrouter"
	ManagedNamespaceReconciler      Reconciler = "managednamespace"
	StackReconciler                 Reconciler = "stack"
	StackDefinitionReconciler       Reconciler = "stackdefinition"
	CustomStackRunReconciler        Reconciler = "customstackrun"
	DeploymentSettingsReconciler    Reconciler = "deploymentsettings"
	ProjectReconciler               Reconciler = "project"
	NamespaceCredentialsReconciler  Reconciler = "namespacecredentials"
	ObservabilityProviderReconciler Reconciler = "observabilityprovider"
	ObserverReconciler              Reconciler = "observerprovider"
	CatalogReconciler               Reconciler = "catalogprovider"
	OIDCProviderReconciler          Reconciler = "oidcprovider"
	GeneratedSecretReconciler       Reconciler = "generatedsecret"
	BootstrapTokenReconciler        Reconciler = "bootstraptoken"
	FlowReconciler                  Reconciler = "flow"
)

// ToReconciler maps reconciler string to a Reconciler type.
func ToReconciler(reconciler string) (Reconciler, error) {
	switch Reconciler(reconciler) {
	case GitRepositoryReconciler:
		fallthrough
	case HelmRepositoryReconciler:
		fallthrough
	case ServiceDeploymentReconciler:
		fallthrough
	case ClusterReconciler:
		fallthrough
	case ClusterRestoreReconciler:
		fallthrough
	case GlobalServiceReconciler:
		fallthrough
	case PipelineReconciler:
		fallthrough
	case ScmConnectionReconciler:
		fallthrough
	case ServiceAccountReconciler:
		fallthrough
	case PrAutomationReconciler:
		fallthrough
	case PipelineContextReconciler:
		fallthrough
	case ClusterRestoreTriggerReconciler:
		fallthrough
	case PrAutomationTriggerReconciler:
		fallthrough
	case NotificationSinkReconciler:
		fallthrough
	case NotificationRouterReconciler:
		fallthrough
	case ManagedNamespaceReconciler:
		fallthrough
	case StackReconciler:
		fallthrough
	case StackDefinitionReconciler:
		fallthrough
	case CustomStackRunReconciler:
		fallthrough
	case DeploymentSettingsReconciler:
		fallthrough
	case ProjectReconciler:
		fallthrough
	case NamespaceCredentialsReconciler:
		fallthrough
	case ObservabilityProviderReconciler:
		fallthrough
	case ObserverReconciler:
		fallthrough
	case CatalogReconciler:
		fallthrough
	case OIDCProviderReconciler:
		fallthrough
	case GeneratedSecretReconciler:
		fallthrough
	case BootstrapTokenReconciler:
		fallthrough
	case FlowReconciler:
		fallthrough
	case ProviderReconciler:
		return Reconciler(reconciler), nil
	}

	return "", fmt.Errorf("reconciler %q is not supported", reconciler)
}

// ToController creates Controller instance based on this Reconciler.
func (sc Reconciler) ToController(mgr ctrl.Manager, consoleClient client.ConsoleClient,
	userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) (Controller, error) {
	switch sc {
	case GitRepositoryReconciler:
		return &controller.GitRepositoryReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case HelmRepositoryReconciler:
		return &controller.HelmRepositoryReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			UserGroupCache:   userGroupCache,
			CredentialsCache: credentialsCache,
			HelmRepositoryAuth: &controller.HelmRepositoryAuth{
				Client: mgr.GetClient(),
				Scheme: mgr.GetScheme(),
			},
		}, nil
	case ServiceDeploymentReconciler:
		return &controller.ServiceReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			UserGroupCache:   userGroupCache,
			CredentialsCache: credentialsCache,
		}, nil
	case ClusterReconciler:
		return &controller.ClusterReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			UserGroupCache:   userGroupCache,
			CredentialsCache: credentialsCache,
		}, nil
	case ClusterRestoreReconciler:
		return &controller.ClusterRestoreReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}, nil
	case PipelineReconciler:
		return &controller.PipelineReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
			UserGroupCache:   userGroupCache,
		}, nil
	case ProviderReconciler:
		return &controller.ProviderReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case GlobalServiceReconciler:
		return &controller.GlobalServiceReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}, nil
	case ScmConnectionReconciler:
		return &controller.ScmConnectionReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case ServiceAccountReconciler:
		return &controller.ServiceAccountReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case PrAutomationReconciler:
		return &controller.PrAutomationReconciler{
			Client:         mgr.GetClient(),
			ConsoleClient:  consoleClient,
			Scheme:         mgr.GetScheme(),
			UserGroupCache: userGroupCache,
		}, nil
	case PipelineContextReconciler:
		return &controller.PipelineContextReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}, nil
	case ClusterRestoreTriggerReconciler:
		return &controller.ClusterRestoreTriggerReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}, nil
	case PrAutomationTriggerReconciler:
		return &controller.PrAutomationTriggerReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}, nil
	case NotificationSinkReconciler:
		return &controller.NotificationSinkReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
			UserGroupCache:   userGroupCache,
		}, nil
	case NotificationRouterReconciler:
		return &controller.NotificationRouterReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}, nil
	case ManagedNamespaceReconciler:
		return &controller.ManagedNamespaceReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}, nil
	case StackReconciler:
		return &controller.InfrastructureStackReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			UserGroupCache:   userGroupCache,
			CredentialsCache: credentialsCache,
		}, nil
	case StackDefinitionReconciler:
		return &controller.StackDefinitionReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}, nil
	case OIDCProviderReconciler:
		return &controller.OIDCProviderReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}, nil
	case CustomStackRunReconciler:
		return &controller.CustomStackRunReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}, nil
	case DeploymentSettingsReconciler:
		return &controller.DeploymentSettingsReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
			UserGroupCache:   userGroupCache,
		}, nil
	case ProjectReconciler:
		return &controller.ProjectReconciler{
			Client:         mgr.GetClient(),
			ConsoleClient:  consoleClient,
			Scheme:         mgr.GetScheme(),
			UserGroupCache: userGroupCache,
		}, nil
	case NamespaceCredentialsReconciler:
		return &controller.NamespaceCredentialsReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}, nil
	case ObservabilityProviderReconciler:
		return &controller.ObservabilityProviderReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}, nil
	case ObserverReconciler:
		return &controller.ObserverReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
			HelmRepositoryAuth: &controller.HelmRepositoryAuth{
				Client: mgr.GetClient(),
				Scheme: mgr.GetScheme(),
			},
		}, nil
	case CatalogReconciler:
		return &controller.CatalogReconciler{
			Client:         mgr.GetClient(),
			ConsoleClient:  consoleClient,
			Scheme:         mgr.GetScheme(),
			UserGroupCache: userGroupCache,
		}, nil
	case GeneratedSecretReconciler:
		return &controller.GeneratedSecretReconciler{
			Client: mgr.GetClient(),
			Scheme: mgr.GetScheme(),
		}, nil
	case BootstrapTokenReconciler:
		return &controller.BootstrapTokenReconciler{
			Client:         mgr.GetClient(),
			ConsoleClient:  consoleClient,
			Scheme:         mgr.GetScheme(),
			UserGroupCache: userGroupCache,
		}, nil
	case FlowReconciler:
		return &controller.FlowReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			CredentialsCache: credentialsCache,
			Scheme:           mgr.GetScheme(),
			UserGroupCache:   userGroupCache,
		}, nil
	default:
		return nil, fmt.Errorf("reconciler %q is not supported", sc)
	}
}

// ReconcilerList is a wrapper around Reconciler array type to allow
// defining custom functions.
type ReconcilerList []Reconciler

// Reconcilers defines a list of reconcilers that will be started by default
// if '--reconcilers=...' flag is not provided.
func Reconcilers() ReconcilerList {
	return []Reconciler{
		GitRepositoryReconciler,
		HelmRepositoryReconciler,
		ProviderReconciler,
		ClusterReconciler,
		ServiceDeploymentReconciler,
		GlobalServiceReconciler,
		PipelineReconciler,
		ScmConnectionReconciler,
		ServiceAccountReconciler,
		PrAutomationReconciler,
		PipelineContextReconciler,
		PrAutomationTriggerReconciler,
		ClusterRestoreTriggerReconciler,
		NotificationSinkReconciler,
		NotificationRouterReconciler,
		ManagedNamespaceReconciler,
		StackReconciler,
		ProjectReconciler,
		DeploymentSettingsReconciler,
		CustomStackRunReconciler,
		ClusterRestoreReconciler,
		NamespaceCredentialsReconciler,
		ObservabilityProviderReconciler,
		ObserverReconciler,
		StackDefinitionReconciler,
		CatalogReconciler,
		OIDCProviderReconciler,
		GeneratedSecretReconciler,
		BootstrapTokenReconciler,
		FlowReconciler,
	}
}

// ToControllers returns a list of Controller instances based on this Reconciler array.
func (rl ReconcilerList) ToControllers(mgr ctrl.Manager, url, token string,
	userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) ([]Controller, error) {
	result := make([]Controller, len(rl))
	for i, r := range rl {
		controller, err := r.ToController(mgr, client.New(url, token), userGroupCache, credentialsCache)
		if err != nil {
			return nil, err
		}

		result[i] = controller
	}

	return result, nil
}
