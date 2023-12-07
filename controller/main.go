package main

import (
	"flag"
	"fmt"
	"github.com/pluralsh/console/controller/pkg/types"
	"go.uber.org/zap"
	"os"
	"strings"

	deploymentsv1alpha "github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	"github.com/pluralsh/console/controller/pkg/client"
	"github.com/pluralsh/console/controller/pkg/log"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/klog"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	ctrlruntimezap "sigs.k8s.io/controller-runtime/pkg/log/zap"
)

var (
	scheme   = runtime.NewScheme()
	setupLog = log.Logger
)

func init() {
	utilruntime.Must(deploymentsv1alpha.AddToScheme(scheme))
	utilruntime.Must(corev1.AddToScheme(scheme))
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
		Development: true,
	}
	opts.BindFlags(flag.CommandLine)
	flag.StringVar(&opt.metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
	flag.StringVar(&opt.probeAddr, "health-probe-bind-address", ":9001", "The address the probe endpoint binds to.")
	flag.BoolVar(&opt.enableLeaderElection, "leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.StringVar(&opt.consoleUrl, "console-url", "", "the url of the console api to fetch services from")
	flag.StringVar(&opt.consoleToken, "console-token", "", "the deploy token to auth to console api with")
	flag.Func("reconcilers", "Comma delimited list of reconciler names. Available reconcilers: gitrepository,cluster,provider,servicedeployment", func(reconcilersStr string) (err error) {
		opt.reconcilers, err = parseReconcilers(reconcilersStr)
		return err
	})

	flag.Parse()

	ctrl.SetLogger(ctrlruntimezap.New(ctrlruntimezap.UseFlagOptions(&opts)))

	if opt.consoleToken == "" {
		opt.consoleToken = os.Getenv("CONSOLE_TOKEN")
	}

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme:                 scheme,
		LeaderElection:         opt.enableLeaderElection,
		LeaderElectionID:       "dep344ab8.plural.sh",
		HealthProbeBindAddress: opt.probeAddr,
	})
	if err != nil {
		setupLog.Error(err, "unable to create manager")
		os.Exit(1)
	}
	if err = mgr.AddHealthzCheck("ping", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to create health check")
		os.Exit(1)
	}

	consoleClient := client.New(opt.consoleUrl, opt.consoleToken)
	controllers, err := opt.reconcilers.ToControllers(mgr, setupLog, consoleClient)
	if err != nil {
		setupLog.Error(err)
		os.Exit(1)
	}

	runOrDie(controllers, mgr, setupLog)
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

func runOrDie(controllers []types.Controller, mgr ctrl.Manager, logger *zap.SugaredLogger) {
	for _, c := range controllers {
		if err := c.SetupWithManager(mgr); err != nil {
			logger.Error(err, "unable to create controller")
			os.Exit(1)
		}
	}

	ctx := ctrl.SetupSignalHandler()
	setupLog.Info("starting manager")
	if err := mgr.Start(ctx); err != nil {
		setupLog.Error(err, "error running manager")
		os.Exit(1)
	}
}
