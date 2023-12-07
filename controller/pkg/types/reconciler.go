package types

import (
	"fmt"
	"github.com/pluralsh/console/controller/pkg/client"
	gitrepositorycontroller "github.com/pluralsh/console/controller/pkg/gitrepository_controller"
	providercontroller "github.com/pluralsh/console/controller/pkg/provider_controller"
	"go.uber.org/zap"
	ctrl "sigs.k8s.io/controller-runtime"
)

// Reconciler is a name of reconciler supported by this controller.
type Reconciler string

const (
	GitRepositoryReconciler     Reconciler = "gitrepository"
	ServiceDeploymentReconciler Reconciler = "servicedeployment"
	ClusterReconciler           Reconciler = "cluster"
	ProviderReconciler          Reconciler = "provider"
)

// ToReconciler maps reconciler string to a Reconciler type.
func ToReconciler(reconciler string) (Reconciler, error) {
	switch Reconciler(reconciler) {
	case GitRepositoryReconciler:
	case ServiceDeploymentReconciler:
	case ClusterReconciler:
	case ProviderReconciler:
		return Reconciler(reconciler), nil
	}

	return "", fmt.Errorf("reconciler %q is not supported", reconciler)
}

// ToController creates Controller instance based on this Reconciler.
func (sc Reconciler) ToController(mgr ctrl.Manager, logger *zap.SugaredLogger, consoleClient client.ConsoleClient) (Controller, error) {
	unsupported := fmt.Errorf("reconciler %q is not supported", sc)

	switch sc {
	case GitRepositoryReconciler:
		return &gitrepositorycontroller.Reconciler{
			Client:        mgr.GetClient(),
			Log:           logger,
			ConsoleClient: consoleClient,
		}, nil
	case ServiceDeploymentReconciler:
		return nil, unsupported
	case ClusterReconciler:
		return nil, unsupported
	case ProviderReconciler:
		return &providercontroller.Reconciler{
			Client:        mgr.GetClient(),
			ConsoleClient: consoleClient,
			Log:           logger,
			Scheme:        mgr.GetScheme(),
		}, nil
	default:
		return nil, unsupported
	}
}

// ReconcilerList is a wrapper around Reconciler array type to allow
// defining custom functions.
type ReconcilerList []Reconciler

// Reconcilers defines a list of reconcilers that will be started by default
// if '--reconcilers=...' flag is not provided.
func Reconcilers() ReconcilerList {
	return []Reconciler{GitRepositoryReconciler, ProviderReconciler}
}

// ToControllers returns a list of Controller instances based on this Reconciler array.
func (rl ReconcilerList) ToControllers(mgr ctrl.Manager, logger *zap.SugaredLogger, consoleClient client.ConsoleClient) ([]Controller, error) {
	result := make([]Controller, len(rl))
	for i, r := range rl {
		controller, err := r.ToController(mgr, logger, consoleClient)
		if err != nil {
			return nil, err
		}

		result[i] = controller
	}

	return result, nil
}
