package main

import (
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/cmd/agent/args"
	"github.com/pluralsh/console/go/deployment-operator/internal/controller"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
)

// registerDevboxRunner starts the DevboxRunner controller when the chart enabled devboxes and the CRD exists.
// Without Substrate credentials the controller still runs, reporting Substrate API errors on each runner.
func registerDevboxRunner(manager ctrl.Manager, operatorNamespace, consoleURL, deployToken, clusterID string) {
	cfg := controller.LoadDevboxConfig(operatorNamespace, consoleURL, deployToken, clusterID)
	if !cfg.Enabled {
		return
	}

	gk := schema.GroupKind{Group: v1alpha1.GroupVersion.Group, Kind: "DevboxRunner"}
	if _, err := manager.GetRESTMapper().RESTMapping(gk, v1alpha1.GroupVersion.Version); err != nil {
		if meta.IsNoMatchError(err) {
			setupLog.Info("DevboxRunner CRD is not installed, devboxes are disabled", "controller", "DevboxRunner")
		} else {
			setupLog.Error(err, "unable to check for the DevboxRunner CRD", "controller", "DevboxRunner")
		}
		return
	}

	_, wpErr := manager.GetRESTMapper().RESTMapping(schema.GroupKind{Group: "ate.dev", Kind: "WorkerPool"}, "v1")
	if wpErr != nil {
		setupLog.Info("Substrate WorkerPool CRD is not installed, DevboxRunners will report errors until it is", "controller", "DevboxRunner")
	}

	var api substrate.API = substrate.Unconfigured{}
	if client, err := substrate.Dial(cfg.Substrate); err != nil {
		setupLog.Error(err, "unable to create the Substrate API client", "controller", "DevboxRunner")
	} else {
		api = client
	}

	consoleClient := controller.NewGraphQLDevboxConsoleClient(consoleURL, deployToken)
	if err := (&controller.DevboxRunnerReconciler{
		Client:    manager.GetClient(),
		APIReader: manager.GetAPIReader(),
		Scheme:    manager.GetScheme(),
		Config:    cfg,
		Console:   consoleClient,
		Substrate: api,
		Images: &controller.RegistryImageResolver{
			Client:          manager.GetClient(),
			SecretNamespace: operatorNamespace,
		},
		Probe: &controller.ConfigMapProbeClient{
			Client:    manager.GetClient(),
			Reader:    manager.GetAPIReader(),
			Namespace: operatorNamespace,
			Tokens:    consoleClient,
		},
		CacheSyncTimeout: args.PollInterval() * 3,
		WatchWorkerPools: wpErr == nil,
	}).SetupWithManager(manager); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "DevboxRunner")
	}
}
