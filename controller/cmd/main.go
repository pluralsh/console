/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package main

import (
	"flag"
	"fmt"
	"os"
	"strings"

	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	deploymentsv1alpha "github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/types"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/klog"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	ctrlruntimezap "sigs.k8s.io/controller-runtime/pkg/log/zap"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	//+kubebuilder:scaffold:imports
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
	// version is managed by GoReleaser, see: https://goreleaser.com/cookbooks/using-main.version/
	version = "dev"
	// commit is managed by GoReleaser, see: https://goreleaser.com/cookbooks/using-main.version/
	commit = "none"
)

func init() {
	utilruntime.Must(corev1.AddToScheme(scheme))

	utilruntime.Must(deploymentsv1alpha.AddToScheme(scheme))

	//+kubebuilder:scaffold:scheme
}

type controllerRunOptions struct {
	enableLeaderElection bool
	metricsAddr          string
	probeAddr            string
	consoleUrl           string
	consoleToken         string
	reconcilers          types.ReconcilerList
}

func main() {
	klog.InitFlags(nil)

	opt := &controllerRunOptions{
		reconcilers: types.Reconcilers(),
	}
	opts := ctrlruntimezap.Options{
		Development: version == "dev",
	}
	opts.BindFlags(flag.CommandLine)
	flag.StringVar(&opt.metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
	flag.StringVar(&opt.probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
	flag.BoolVar(&opt.enableLeaderElection, "leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.StringVar(&opt.consoleUrl, "console-url", "", "The url of the console api to fetch services from")
	flag.StringVar(&opt.consoleToken, "console-token", "", "The console token to auth to console api with")
	flag.Func("reconcilers", "Comma delimited list of reconciler names. Available reconcilers: gitrepository,cluster,provider,servicedeployment", func(reconcilersStr string) (err error) {
		opt.reconcilers, err = parseReconcilers(reconcilersStr)
		return err
	})

	flag.Parse()
	if flag.Arg(0) == "version" {
		versionInfo()
		return
	}

	ctrl.SetLogger(ctrlruntimezap.New(ctrlruntimezap.UseFlagOptions(&opts)))

	if opt.consoleToken == "" {
		opt.consoleToken = os.Getenv("CONSOLE_TOKEN")
	}

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme:                 scheme,
		Metrics:                metricsserver.Options{BindAddress: opt.metricsAddr},
		HealthProbeBindAddress: opt.probeAddr,
		LeaderElection:         opt.enableLeaderElection,
		LeaderElectionID:       "144e1fda.plural.sh",
		// LeaderElectionReleaseOnCancel defines if the leader should step down voluntarily
		// when the Manager ends. This requires the binary to immediately end when the
		// Manager is stopped, otherwise, this setting is unsafe. Setting this significantly
		// speeds up voluntary leader transitions as the new leader don't have to wait
		// LeaseDuration time first.
		//
		// In the default scaffold provided, the program ends immediately after
		// the manager stops, so would be fine to enable this option. However,
		// if you are doing or is intended to do any operation such as perform cleanups
		// after the manager stops then its usage might be unsafe.
		// LeaderElectionReleaseOnCancel: true,
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		os.Exit(1)
	}

	//+kubebuilder:scaffold:builder

	if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up health check")
		os.Exit(1)
	}
	if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up ready check")
		os.Exit(1)
	}

	consoleClient := client.New(opt.consoleUrl, opt.consoleToken)
	controllers, err := opt.reconcilers.ToControllers(mgr, consoleClient)
	if err != nil {
		setupLog.Error(err, "error when creating controllers")
		os.Exit(1)
	}

	runOrDie(controllers, mgr)
}

func parseReconcilers(reconcilersStr string) (types.ReconcilerList, error) {
	split := strings.Split(reconcilersStr, ",")
	if len(reconcilersStr) == 0 || len(split) == 0 {
		return nil, fmt.Errorf("reconcilers arg cannot be empty")
	}

	result := make(types.ReconcilerList, len(split))
	for i, r := range split {
		reconciler, err := types.ToReconciler(r)
		if err != nil {
			return nil, err
		}

		result[i] = reconciler
	}

	return result, nil
}

func runOrDie(controllers []types.Controller, mgr ctrl.Manager) {
	for _, c := range controllers {
		if err := c.SetupWithManager(mgr); err != nil {
			setupLog.Error(err, "unable to setup controller")
			os.Exit(1)
		}
	}

	ctx := ctrl.SetupSignalHandler()
	setupLog.Info("starting manager")
	if err := mgr.Start(ctx); err != nil {
		setupLog.Error(err, "problem running manager")
		os.Exit(1)
	}
}

func versionInfo() {
	fmt.Println("PLURAL CONTROLLER:")
	fmt.Printf("   version\t%s\n", version)
	fmt.Printf("   git commit\t%s\n", commit)
}
