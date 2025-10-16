package types

import (
	"fmt"
	"slices"

	"github.com/samber/lo"
	"k8s.io/klog/v2"
	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
)

// Reconciler is a name of reconciler supported by this controller.
type Reconciler string

// List of supported reconcilers.
// Sorted alphabetically for easier maintenance.
// Please keep it that way :)
// Note: If you add a new reconciler, please also register it in the cmd/register.go file
const (
	BootstrapTokenReconciler             Reconciler = "bootstraptoken"
	CatalogReconciler                    Reconciler = "catalog"
	CloudConnectionReconciler            Reconciler = "cloudconnection"
	ClusterReconciler                    Reconciler = "cluster"
	ClusterRestoreReconciler             Reconciler = "clusterrestore"
	ClusterRestoreTriggerReconciler      Reconciler = "clusterrestoretrigger"
	ClusterSyncReconciler                Reconciler = "clustersync"
	ComplianceReportGeneratorReconciler  Reconciler = "compliancereportgenerator"
	CustomStackRunReconciler             Reconciler = "customstackrun"
	DeploymentSettingsReconciler         Reconciler = "deploymentsettings"
	FederatedCredentialReconciler        Reconciler = "federatedcredential"
	FlowReconciler                       Reconciler = "flow"
	GeneratedSecretReconciler            Reconciler = "generatedsecret"
	GitRepositoryReconciler              Reconciler = "gitrepository"
	GlobalServiceReconciler              Reconciler = "globalservice"
	HelmRepositoryReconciler             Reconciler = "helmrepository"
	ManagedNamespaceReconciler           Reconciler = "managednamespace"
	MCPServerReconciler                  Reconciler = "mcpserver"
	NamespaceCredentialsReconciler       Reconciler = "namespacecredential"
	NotificationRouterReconciler         Reconciler = "notificationrouter"
	NotificationSinkReconciler           Reconciler = "notificationsink"
	ObservabilityProviderReconciler      Reconciler = "observabilityprovider"
	ObserverReconciler                   Reconciler = "observer"
	OIDCProviderReconciler               Reconciler = "oidcprovider"
	PersonaReconciler                    Reconciler = "persona"
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
	InfrastructureStackReconciler        Reconciler = "infrastructurestack"
	PrGovernanceReconciler               Reconciler = "prgovernance"
	SentinelReconciler                   Reconciler = "sentinel"
)

// ToController maps a Reconciler to its corresponding Controller.
func (sc Reconciler) ToController(mgr ctrl.Manager, consoleClient client.ConsoleClient,
	credentialsCache credentials.NamespaceCredentialsCache) (Controller, error) {

	if factory, exists := controllerFactories[sc]; exists {
		return factory(mgr, consoleClient, credentialsCache), nil
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

// ShardedReconcilers returns a list of sharded reconcilers
func ShardedReconcilers() ReconcilerList {
	return []Reconciler{
		ServiceDeploymentReconciler,
		PipelineReconciler,
		FlowReconciler,
		GlobalServiceReconciler,
		InfrastructureStackReconciler,
	}
}

// ToControllers returns a list of Controller instances based on this Reconciler array.
func (rl ReconcilerList) ToControllers(mgr ctrl.Manager, url, token string,
	credentialsCache credentials.NamespaceCredentialsCache) ([]Controller, []Processor, error) {
	controllers := make([]Controller, len(rl))
	shardedReconcilersList := ShardedReconcilers()
	shardedControllers := make([]Processor, 0, len(shardedReconcilersList))
	for i, r := range rl {
		controller, err := r.ToController(mgr, client.New(url, token), credentialsCache)
		if err != nil {
			return nil, nil, err
		}

		if slices.Contains(shardedReconcilersList, r) {
			// We assume that all sharded controllers implement the Processor interface.
			shardedControllers = append(shardedControllers, controller.(Processor))
		}

		controllers[i] = controller
	}

	return controllers, shardedControllers, nil
}

type ControllerFactoryFunc func(
	mgr ctrl.Manager,
	consoleClient client.ConsoleClient,
	credentialsCache credentials.NamespaceCredentialsCache,
) Controller

var controllerFactories = map[Reconciler]ControllerFactoryFunc{}

func RegisterController(r Reconciler, f ControllerFactoryFunc) {
	if _, exists := controllerFactories[r]; exists {
		klog.Fatalf("controller %q already registered", r)
	}

	controllerFactories[r] = f
}
