package types

import (
	"fmt"

	"github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/controller"
	ctrl "sigs.k8s.io/controller-runtime"
)

// Reconciler is a name of reconciler supported by this controller.
type Reconciler string

const (
	GitRepositoryReconciler     Reconciler = "gitrepository"
	ServiceDeploymentReconciler Reconciler = "servicedeployment"
	ClusterReconciler           Reconciler = "cluster"
	ProviderReconciler          Reconciler = "provider"
	GlobalServiceReconciler     Reconciler = "globalservice"
	PipelineReconciler          Reconciler = "pipeline"
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
	case GlobalServiceReconciler:
		fallthrough
	case PipelineReconciler:
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
	return []Reconciler{GitRepositoryReconciler, ProviderReconciler, ClusterReconciler, ServiceDeploymentReconciler, GlobalServiceReconciler, PipelineReconciler}
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
