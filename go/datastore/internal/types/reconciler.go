package types

import (
	"fmt"

	"github.com/pluralsh/console/go/datastore/internal/client"
	"github.com/pluralsh/console/go/datastore/internal/controller"
	ctrl "sigs.k8s.io/controller-runtime"
)

// Reconciler is a name of reconciler supported by this controller.
type Reconciler string

const (
	ElasticSearchCredentialsReconciler Reconciler = "elasticSearchCredentials"
	ElasticSearchUserReconciler        Reconciler = "elasticSearchUser"
)

var validReconcilers = map[string]Reconciler{
	"ElasticSearchCredentialsReconciler": ElasticSearchCredentialsReconciler,
	"ElasticSearchUserReconciler":        ElasticSearchUserReconciler,
}

type ControllerFactory func(mgr ctrl.Manager, consoleClient client.ConsoleClient) Controller

var controllerFactories = map[Reconciler]ControllerFactory{
	ElasticSearchCredentialsReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient) Controller {
		return &controller.ElasticSearchCredentialsReconciler{
			Client: mgr.GetClient(),
			Scheme: mgr.GetScheme(),
		}
	},
	ElasticSearchUserReconciler: func(mgr ctrl.Manager, consoleClient client.ConsoleClient) Controller {
		return &controller.ElasticSearchUserReconciler{
			Client: mgr.GetClient(),
			Scheme: mgr.GetScheme(),
		}
	},
}

// ToController maps a Reconciler to its corresponding Controller.
func (sc Reconciler) ToController(mgr ctrl.Manager, consoleClient client.ConsoleClient) (Controller, error) {

	if factory, exists := controllerFactories[sc]; exists {
		return factory(mgr, consoleClient), nil
	}
	return nil, fmt.Errorf("reconciler %q is not supported", sc)
}

// ToReconciler maps reconciler string to a Reconciler type.
func ToReconciler(reconciler string) (Reconciler, error) {
	if r, exists := validReconcilers[reconciler]; exists {
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
	return []Reconciler{
		ElasticSearchCredentialsReconciler,
		ElasticSearchUserReconciler,
	}
}

// ToControllers returns a list of Controller instances based on this Reconciler array.
func (rl ReconcilerList) ToControllers(mgr ctrl.Manager, url, token string) ([]Controller, error) {
	result := make([]Controller, len(rl))
	for i, r := range rl {
		toController, err := r.ToController(mgr, client.New(url, token))
		if err != nil {
			return nil, err
		}

		result[i] = toController
	}

	return result, nil
}
