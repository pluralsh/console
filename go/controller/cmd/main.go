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
	"context"
	"fmt"
	"os"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/apimachinery/pkg/util/wait"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"k8s.io/klog/v2"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"

	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.
	deploymentsv1alpha "github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/cmd/args"
	"github.com/pluralsh/console/go/controller/internal/cache"
	"github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/types"
)

var (
	scheme   = runtime.NewScheme()
	setupLog = klog.NewKlogr().WithName("setup")

	// version is managed by GoReleaser, see: https://goreleaser.com/cookbooks/using-main.version/
	version = "dev"
	// commit is managed by GoReleaser, see: https://goreleaser.com/cookbooks/using-main.version/
	commit = "none"
)

func init() {
	utilruntime.Must(corev1.AddToScheme(scheme))
	utilruntime.Must(deploymentsv1alpha.AddToScheme(scheme))
}

func main() {
	args.Init()
	ctrl.SetLogger(setupLog)

	if args.Version() {
		versionInfo()
		return
	}

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme:                 scheme,
		Metrics:                metricsserver.Options{BindAddress: args.MetricsBindAddress()},
		HealthProbeBindAddress: args.HealthProbeBindAddress(),
		LeaderElection:         args.EnableLeaderElection(),
		LeaderElectionID:       "144e1fda.plural.sh",
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		os.Exit(1)
	}

	if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up health check")
		os.Exit(1)
	}
	if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up ready check")
		os.Exit(1)
	}

	consoleClient := client.New(args.ConsoleUrl(), args.ConsoleToken())
	userGroupCache := cache.NewUserGroupCache(consoleClient)
	go func() {
		_ = wait.PollUntilContextCancel(context.Background(), args.WipeCacheInterval(), true,
			func(ctx context.Context) (done bool, err error) {
				userGroupCache.Wipe()
				return true, nil
			})
	}()

	credentialsCache, err := credentials.NewNamespaceCredentialsCache(args.ConsoleToken(), scheme)
	if err != nil {
		setupLog.Error(err, "unable to initialize credentials cache")
		os.Exit(1)
	}

	controllers, shardedControllers, err := args.Reconcilers().ToControllers(
		mgr, args.ConsoleUrl(), args.ConsoleToken(), userGroupCache, credentialsCache)
	if err != nil {
		setupLog.Error(err, "error when creating controllers")
		os.Exit(1)
	}

	runOrDie(controllers, shardedControllers, mgr)
}

func runOrDie(controllers []types.Controller, shardedControllers []types.Processor, mgr ctrl.Manager) {
	ctx := ctrl.SetupSignalHandler()

	for _, c := range controllers {
		if err := c.SetupWithManager(mgr); err != nil {
			setupLog.Error(err, "unable to setup controller")
			os.Exit(1)
		}
	}

	setupLog.Info("starting sharded controllers")
	for _, c := range shardedControllers {
		m := types.NewManager(args.ShardedReconcilerWorkers(c.Name()), c)
		go m.Start(ctx)
	}

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
