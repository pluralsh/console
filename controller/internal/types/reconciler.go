package types

import (
	"fmt"

	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/controller"
)

// Reconciler is a name of reconciler supported by this controller.
type Reconciler string

const (
	GitRepositoryReconciler         Reconciler = "gitrepository"
	ServiceDeploymentReconciler     Reconciler = "servicedeployment"
	ClusterReconciler               Reconciler = "cluster"
	ClusterRestoreReconciler        Reconciler = "clusterrestore"
	ProviderReconciler              Reconciler = "provider"
	GlobalServiceReconciler         Reconciler = "globalservice"
	PipelineReconciler              Reconciler = "pipeline"
	ScmConnectionReconciler         Reconciler = "scmconnection"
	PrAutomationReconciler          Reconciler = "prautomation"
	PipelineContextReconciler       Reconciler = "pipelinecontext"
	ClusterRestoreTriggerReconciler Reconciler = "restoretrigger"
	PrAutomationTriggerReconciler   Reconciler = "prautomationtrigger"
)

// ToReconciler maps reconciler string to a Reconciler type.
func ToReconciler(reconciler string) (Reconciler, error) {
	switch Reconciler(reconciler) {
	case GitRepositoryReconciler:
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
	case PrAutomationReconciler:
		fallthrough
	case PipelineContextReconciler:
		fallthrough
	case ClusterRestoreTriggerReconciler:
		fallthrough
	case PrAutomationTriggerReconciler:
		fallthrough
	case ProviderReconciler:
		return Reconciler(reconciler), nil
	}

	return "", fmt.Errorf("reconciler %q is not supported", reconciler)
}

// ToController creates Controller instance based on this Reconciler.
func (sc Reconciler) ToController(mgr ctrl.Manager, consoleClient client.ConsoleClient) (Controller, error) {
	switch sc {
	case GitRepositoryReconciler:
		return &controller.GitRepositoryReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case ServiceDeploymentReconciler:
		return &controller.ServiceReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case ClusterReconciler:
		return &controller.ClusterReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case ClusterRestoreReconciler:
		return &controller.ClusterRestoreReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case PipelineReconciler:
		return &controller.PipelineReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case ProviderReconciler:
		return &controller.ProviderReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case GlobalServiceReconciler:
		return &controller.GlobalServiceReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case ScmConnectionReconciler:
		return &controller.ScmConnectionReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case PrAutomationReconciler:
		return &controller.PrAutomationReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case PipelineContextReconciler:
		return &controller.PipelineContextReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case ClusterRestoreTriggerReconciler:
		return &controller.ClusterRestoreTriggerReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
		}, nil
	case PrAutomationTriggerReconciler:
		return &controller.PrAutomationTriggerReconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Scheme:        mgr.GetScheme(),
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
	return []Reconciler{GitRepositoryReconciler, ProviderReconciler, ClusterReconciler, ServiceDeploymentReconciler, GlobalServiceReconciler, PipelineReconciler, ScmConnectionReconciler, PrAutomationReconciler, PipelineContextReconciler, PrAutomationTriggerReconciler, ClusterRestoreTriggerReconciler}
}

// ToControllers returns a list of Controller instances based on this Reconciler array.
func (rl ReconcilerList) ToControllers(mgr ctrl.Manager, consoleClient client.ConsoleClient) ([]Controller, error) {
	result := make([]Controller, len(rl))
	for i, r := range rl {
		controller, err := r.ToController(mgr, consoleClient)
		if err != nil {
			return nil, err
		}

		result[i] = controller
	}

	return result, nil
}
