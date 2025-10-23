package main

import (
	"k8s.io/client-go/util/workqueue"
	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/controller"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/types"
)

// register all controllers with the controller manager.
func init() {
	types.RegisterController(types.BootstrapTokenReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.BootstrapTokenReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	})

	types.RegisterController(types.CatalogReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.CatalogReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	})

	types.RegisterController(types.CloudConnectionReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.CloudConnectionReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	})

	types.RegisterController(types.ClusterReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.ClusterReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(types.ClusterRestoreReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.ClusterRestoreReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(types.ClusterRestoreTriggerReconciler, func(mgr ctrl.Manager,
		consoleClient client.ConsoleClient, credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.ClusterRestoreTriggerReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(types.ClusterSyncReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.ClusterSyncReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	})

	types.RegisterController(types.ComplianceReportGeneratorReconciler, func(mgr ctrl.Manager,
		consoleClient client.ConsoleClient, credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.ComplianceReportGeneratorReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			CredentialsCache: credentialsCache,
			Scheme:           mgr.GetScheme(),
		}
	})

	types.RegisterController(types.CustomStackRunReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.CustomStackRunReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(types.DeploymentSettingsReconciler, func(mgr ctrl.Manager,
		consoleClient client.ConsoleClient, credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.DeploymentSettingsReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(types.FlowReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.FlowReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			CredentialsCache: credentialsCache,
			Scheme:           mgr.GetScheme(),
			FlowQueue:        workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[ctrl.Request]()),
		}
	})

	types.RegisterController(types.GeneratedSecretReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.GeneratedSecretReconciler{
			Client: mgr.GetClient(),
			Scheme: mgr.GetScheme(),
		}
	})

	types.RegisterController(types.GitRepositoryReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.GitRepositoryReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	})

	types.RegisterController(types.GlobalServiceReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.GlobalServiceReconciler{
			Client:             mgr.GetClient(),
			ConsoleClient:      consoleClient,
			Scheme:             mgr.GetScheme(),
			CredentialsCache:   credentialsCache,
			GlobalServiceQueue: workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[ctrl.Request]()),
		}
	})

	types.RegisterController(types.HelmRepositoryReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.HelmRepositoryReconciler{
			Client:             mgr.GetClient(),
			ConsoleClient:      consoleClient,
			Scheme:             mgr.GetScheme(),
			CredentialsCache:   credentialsCache,
			HelmRepositoryAuth: &controller.HelmRepositoryAuth{Client: mgr.GetClient(), Scheme: mgr.GetScheme()},
		}
	})

	types.RegisterController(types.ManagedNamespaceReconciler, func(mgr ctrl.Manager,
		consoleClient client.ConsoleClient, credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.ManagedNamespaceReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(types.MCPServerReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.MCPServerReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			CredentialsCache: credentialsCache,
			Scheme:           mgr.GetScheme(),
		}
	})

	types.RegisterController(types.NamespaceCredentialsReconciler, func(mgr ctrl.Manager,
		consoleClient client.ConsoleClient, credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.NamespaceCredentialsReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(types.NotificationRouterReconciler, func(mgr ctrl.Manager,
		consoleClient client.ConsoleClient, credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.NotificationRouterReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(types.NotificationSinkReconciler, func(mgr ctrl.Manager,
		consoleClient client.ConsoleClient, credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.NotificationSinkReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(types.ObservabilityProviderReconciler, func(mgr ctrl.Manager,
		consoleClient client.ConsoleClient, credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.ObservabilityProviderReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(types.ObserverReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.ObserverReconciler{
			Client:             mgr.GetClient(),
			ConsoleClient:      consoleClient,
			Scheme:             mgr.GetScheme(),
			CredentialsCache:   credentialsCache,
			HelmRepositoryAuth: &controller.HelmRepositoryAuth{Client: mgr.GetClient(), Scheme: mgr.GetScheme()},
		}
	})

	types.RegisterController(types.OIDCProviderReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.OIDCProviderReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(
		types.PersonaReconciler,
		func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
			credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
			return &controller.PersonaReconciler{
				Client:           mgr.GetClient(),
				ConsoleClient:    consoleClient,
				Scheme:           mgr.GetScheme(),
				CredentialsCache: credentialsCache,
			}
		})

	types.RegisterController(types.PipelineContextReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.PipelineContextReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(types.PipelineReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.PipelineReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
			PipelineQueue:    workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[ctrl.Request]()),
		}
	})

	types.RegisterController(types.PrAutomationReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.PrAutomationReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	})

	types.RegisterController(types.PrAutomationTriggerReconciler, func(mgr ctrl.Manager,
		consoleClient client.ConsoleClient, credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.PrAutomationTriggerReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(types.PreviewEnvironmentTemplateReconciler, func(mgr ctrl.Manager,
		consoleClient client.ConsoleClient, credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.PreviewEnvironmentTemplateReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	})

	types.RegisterController(types.ProjectReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.ProjectReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	})

	types.RegisterController(types.ScmConnectionReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.ScmConnectionReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	})

	types.RegisterController(types.ServiceAccountReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.ServiceAccountReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	})

	types.RegisterController(types.ServiceContextReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.ServiceContextReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	})

	types.RegisterController(types.ServiceDeploymentReconciler, func(mgr ctrl.Manager,
		consoleClient client.ConsoleClient, credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.ServiceDeploymentReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
			ServiceQueue:     workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[ctrl.Request]()),
		}
	})

	types.RegisterController(types.StackDefinitionReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.StackDefinitionReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

	types.RegisterController(
		types.InfrastructureStackReconciler,
		func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
			credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
			return &controller.InfrastructureStackReconciler{
				Client:           mgr.GetClient(),
				ConsoleClient:    consoleClient,
				Scheme:           mgr.GetScheme(),
				CredentialsCache: credentialsCache,
				StackQueue:       workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[ctrl.Request]()),
			}
		},
	)

	types.RegisterController(types.PrGovernanceReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache) types.Controller {
		return &controller.PrGovernanceReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}
	})

	types.RegisterController(types.FederatedCredentialReconciler, func(
		mgr ctrl.Manager,
		consoleClient client.ConsoleClient,
		_ credentials.NamespaceCredentialsCache,
	) types.Controller {
		return &controller.FederatedCredentialReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
		}
	})

	types.RegisterController(types.SentinelReconciler, func(mgr ctrl.Manager, consoleClient client.ConsoleClient,
		credentialsCache credentials.NamespaceCredentialsCache,
	) types.Controller {
		return &controller.SentinelReconciler{
			Client:           mgr.GetClient(),
			ConsoleClient:    consoleClient,
			Scheme:           mgr.GetScheme(),
			CredentialsCache: credentialsCache,
		}
	})

}
