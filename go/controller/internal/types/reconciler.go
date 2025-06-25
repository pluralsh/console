package types

import (
	"fmt"

	"github.com/samber/lo"
	"k8s.io/client-go/util/workqueue"
	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/pluralsh/console/go/controller/internal/cache"
	"github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/controller"
	"github.com/pluralsh/console/go/controller/internal/credentials"
)

// Reconciler is a name of reconciler supported by this controller.
type Reconciler string

const (
	BootstrapTokenReconciler             Reconciler = "bootstraptoken"
	CatalogReconciler                    Reconciler = "catalogprovider"
	CloudConnectionReconciler            Reconciler = "cloudconnection"
	ClusterReconciler                    Reconciler = "cluster"
	ClusterRestoreReconciler             Reconciler = "clusterrestore"
	ClusterRestoreTriggerReconciler      Reconciler = "restoretrigger"
	ClusterSyncReconciler                Reconciler = "clustersync"
	ComplianceReportGeneratorReconciler  Reconciler = "compliancereportgenerator"
	CustomStackRunReconciler             Reconciler = "customstackrun"
	DeploymentSettingsReconciler         Reconciler = "deploymentsettings"
	FlowReconciler                       Reconciler = "flow"
	GeneratedSecretReconciler            Reconciler = "generatedsecret"
	GitRepositoryReconciler              Reconciler = "gitrepository"
	GlobalServiceReconciler              Reconciler = "globalservice"
	HelmRepositoryReconciler             Reconciler = "helmrepository"
	ManagedNamespaceReconciler           Reconciler = "managednamespace"
	MCPServerReconciler                  Reconciler = "mcpserver"
	NamespaceCredentialsReconciler       Reconciler = "namespacecredentials"
	NotificationRouterReconciler         Reconciler = "notificationrouter"
	NotificationSinkReconciler           Reconciler = "notificationsink"
	ObservabilityProviderReconciler      Reconciler = "observabilityprovider"
	ObserverReconciler                   Reconciler = "observerprovider"
	OIDCProviderReconciler               Reconciler = "oidcprovider"
	PipelineContextReconciler            Reconciler = "pipelinecontext"
	PipelineReconciler                   Reconciler = "pipeline"
	PrAutomationReconciler               Reconciler = "prautomation"
	PrAutomationTriggerReconciler        Reconciler = "prautomationtrigger"
	PreviewEnvironmentTemplateReconciler Reconciler = "previewenvironmenttemplate"
	ProjectReconciler                    Reconciler = "project"
	ProviderReconciler                   Reconciler = "provider"
	ScmConnectionReconciler              Reconciler = "scmconnection"
	ServiceAccountReconciler             Reconciler = "serviceaccount"
	ServiceContextReconciler             Reconciler = "servicecontext"
	ServiceDeploymentReconciler          Reconciler = "servicedeployment"
	StackDefinitionReconciler            Reconciler = "stackdefinition"
	StackReconciler                      Reconciler = "stack"
)

type ControllerFactory func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
	userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller

var controllerFactories = map[Reconciler]ControllerFactory{
	GitRepositoryReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.GitRepositoryReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme()}
	},
	HelmRepositoryReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.HelmRepositoryReconciler{
			Client:             mgr.GetClient(),
			ConsoleClient:      consoleClient,
			Scheme:             mgr.GetScheme(),
			UserGroupCache:     userGroupCache,
			CredentialsCache:   credentialsCache,
			HelmRepositoryAuth: &controller.HelmRepositoryAuth{Client: mgr.GetClient(), Scheme: mgr.GetScheme()},
		}
	},
	ServiceDeploymentReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ServiceReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			UserGroupCache:   userGroupCache,
			CredentialsCache: credentialsCache,
			ServiceQueue:     workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[ctrl.Request]()),
		}
	},
	ClusterReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ClusterReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			UserGroupCache:   userGroupCache,
			CredentialsCache: credentialsCache,
		}
	},
	ClusterRestoreReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ClusterRestoreReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	},
	PipelineReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.PipelineReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
			UserGroupCache:   userGroupCache,
			PipelineQueue:    workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[ctrl.Request]()),
		}
	},
	ProviderReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ProviderReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	},
	GlobalServiceReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.GlobalServiceReconciler{
			Client:             mgr.GetClient(),
			ConsoleClient:      consoleClient,
			Scheme:             mgr.GetScheme(),
			CredentialsCache:   credentialsCache,
			GlobalServiceQueue: workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[ctrl.Request]()),
		}
	},
	ScmConnectionReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ScmConnectionReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	},
	ServiceAccountReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ServiceAccountReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	},
	PrAutomationReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.PrAutomationReconciler{
			Client:         mgr.GetClient(),
			ConsoleClient:  consoleClient,
			Scheme:         mgr.GetScheme(),
			UserGroupCache: userGroupCache,
		}
	},
	PipelineContextReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.PipelineContextReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	},
	ClusterRestoreTriggerReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ClusterRestoreTriggerReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	},
	PrAutomationTriggerReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.PrAutomationTriggerReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	},
	NotificationSinkReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.NotificationSinkReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
			UserGroupCache:   userGroupCache,
		}
	},
	NotificationRouterReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.NotificationRouterReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	},
	ManagedNamespaceReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ManagedNamespaceReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	},
	StackReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.InfrastructureStackReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			UserGroupCache:   userGroupCache,
			CredentialsCache: credentialsCache,
			StackQueue:       workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[ctrl.Request]()),
		}
	},
	StackDefinitionReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.StackDefinitionReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	},
	OIDCProviderReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.OIDCProviderReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	},
	CustomStackRunReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.CustomStackRunReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	},
	DeploymentSettingsReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.DeploymentSettingsReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
			UserGroupCache:   userGroupCache,
		}
	},
	ProjectReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ProjectReconciler{
			Client:         mgr.GetClient(),
			ConsoleClient:  consoleClient,
			Scheme:         mgr.GetScheme(),
			UserGroupCache: userGroupCache,
		}
	},
	NamespaceCredentialsReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.NamespaceCredentialsReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	},
	ObservabilityProviderReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ObservabilityProviderReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	},
	ObserverReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ObserverReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
			HelmRepositoryAuth: &controller.HelmRepositoryAuth{
				Client: mgr.GetClient(),
				Scheme: mgr.GetScheme(),
			},
		}
	},
	CatalogReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.CatalogReconciler{
			Client:         mgr.GetClient(),
			ConsoleClient:  consoleClient,
			Scheme:         mgr.GetScheme(),
			UserGroupCache: userGroupCache,
		}
	},
	GeneratedSecretReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.GeneratedSecretReconciler{
			Client: mgr.GetClient(),
			Scheme: mgr.GetScheme(),
		}
	},
	BootstrapTokenReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.BootstrapTokenReconciler{
			Client:         mgr.GetClient(),
			ConsoleClient:  consoleClient,
			Scheme:         mgr.GetScheme(),
			UserGroupCache: userGroupCache,
		}
	},
	FlowReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.FlowReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			CredentialsCache: credentialsCache,
			Scheme:           mgr.GetScheme(),
			UserGroupCache:   userGroupCache,
			FlowQueue:        workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[ctrl.Request]()),
		}
	},
	MCPServerReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.MCPServerReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			CredentialsCache: credentialsCache,
			Scheme:           mgr.GetScheme(),
			UserGroupCache:   userGroupCache,
		}
	},
	ComplianceReportGeneratorReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ComplianceReportGeneratorReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			CredentialsCache: credentialsCache,
			Scheme:           mgr.GetScheme(),
			UserGroupCache:   userGroupCache,
		}
	},
	PreviewEnvironmentTemplateReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.PreviewEnvironmentTemplateReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	},
	ClusterSyncReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ClusterSyncReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	},
	ServiceContextReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.ServiceContextReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	},
	CloudConnectionReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient, userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) Controller {
		return &controller.CloudConnectionReconciler{
			Client:         mgr.GetClient(),
			ConsoleClient:  consoleClient,
			Scheme:         mgr.GetScheme(),
			UserGroupCache: userGroupCache,
		}
	},
}

// ToController maps a Reconciler to its corresponding Controller.
func (sc Reconciler) ToController(mgr ctrl.Manager, consoleClient client.ConsoleClient,
	userGroupCache cache.UserGroupCache, credentialsCache credentials.NamespaceCredentialsCache) (Controller, error) {

	if factory, exists := controllerFactories[sc]; exists {
		return factory(mgr, consoleClient, userGroupCache, credentialsCache), nil
	}
	return nil, fmt.Errorf("reconciler %q is not supported", sc)
}

// ToReconciler maps reconciler string to a Reconciler type.
func ToReconciler(reconciler string) (Reconciler, error) {
	r := Reconciler(reconciler)
	if _, exists := controllerFactories[r]; exists {
		return r, nil
	}
	return "", fmt.Errorf("reconciler %q is not supported", reconciler)
}

// ReconcilerList is a wrapper around Reconciler array type to allow
// defining custom functions.
type ReconcilerList []Reconciler

// Reconcilers defines a list of reconcilers that will be started by default
// if '--reconcilers=...' flag is not provided.
func Reconcilers() ReconcilerList {
	return lo.Keys(controllerFactories)
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
