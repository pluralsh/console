package main

import (
	"flag"
	"os"

	deploymentsv1alpha "github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	"github.com/pluralsh/console/controller/pkg/client"
	gitrepositorycontroller "github.com/pluralsh/console/controller/pkg/gitrepository_controller"
	"github.com/pluralsh/console/controller/pkg/log"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/klog"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
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
}

func main() {
	klog.InitFlags(nil)

	opt := &controllerRunOptions{}
	opts := zap.Options{
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

	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

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

	if err = (&gitrepositorycontroller.Reconciler{
		Client:        mgr.GetClient(),
		Log:           setupLog.Named("gitrepository-operator"),
		ConsoleClient: consoleClient,
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "gitrepository")
		os.Exit(1)
	}

	ctx := ctrl.SetupSignalHandler()
	setupLog.Info("starting manager")
	if err := mgr.Start(ctx); err != nil {
		setupLog.Error(err, "problem running manager")
		os.Exit(1)
	}
}
