package types

import (
	"fmt"
	"github.com/pluralsh/console/controller/pkg/client"
	gitrepositorycontroller "github.com/pluralsh/console/controller/pkg/gitrepository_controller"
	providercontroller "github.com/pluralsh/console/controller/pkg/provider_controller"
	"go.uber.org/zap"
	ctrl "sigs.k8s.io/controller-runtime"
)

type Reconciler string

const (
	GitRepositoryReconciler     Reconciler = "gitrepository"
	ServiceDeploymentReconciler Reconciler = "servicedeployment"
	ClusterReconciler           Reconciler = "cluster"
	ProviderReconciler          Reconciler = "provider"
)

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

type ReconcilerList []Reconciler

func Reconcilers() ReconcilerList {
	return []Reconciler{GitRepositoryReconciler, ProviderReconciler}
}

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
