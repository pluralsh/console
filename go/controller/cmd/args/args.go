package args

import (
	"flag"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/controller/internal/log"
	"github.com/pluralsh/console/go/controller/internal/types"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	defaultWipeCacheInterval = 30 * time.Minute
	defaultMetricsAddr       = ":8080"
	defaultHealthProbeAddr   = ":8081"
)

var (
	reconcilers types.ReconcilerList

	argConsoleUrl = flag.String("console-url", utils.GetEnv("CONSOLE_URL", ""),
		"The url of the console api to fetch services from")
	argConsoleToken = flag.String("console-token", utils.GetEnv("CONSOLE_TOKEN", ""),
		"The console token to auth to console api with. Can also be set via CONSOLE_TOKEN environment variable.")
	argMetricsBindAddress = flag.String("metrics-bind-address", defaultMetricsAddr,
		"The address the metric endpoint binds to.")
	argHealthProbeBindAddress = flag.String("health-probe-bind-address", defaultHealthProbeAddr,
		"The address the probe endpoint binds to.")
	argLeaderElect = flag.Bool("leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	argWipeCacheInterval = flag.Duration("wipe-cache-interval", defaultWipeCacheInterval,
		"Interval at which the cache is wiped.")
	argVersion = flag.Bool("version", false, "Print version information and exit.")

	shardedReconcilersWorkerConfigMap = createShardedReconcilerWorkersFlags(types.ShardedReconcilers())
	// Register zap-log-level flag as a fallback for klog v flag to be backward compatible.
	_ = flag.Int("zap-log-level", int(log.LogLevelDefault), "The number for the log level verbosity.")
)

func setupReconcilersFlag(arg string) error {
	split := strings.Split(arg, ",")
	if len(arg) == 0 || len(split) == 0 {
		reconcilers = types.Reconcilers()
	}

	result := make(types.ReconcilerList, 0, len(split))
	for _, r := range split {
		reconciler, err := types.ToReconciler(r)
		if err != nil {
			klog.Fatalf("invalid reconciler %s: %v", r, err)
		}

		result = append(result, reconciler)
	}

	reconcilers = result
	return nil
}

func Init() {
	defaultFlagSet := flag.CommandLine

	// Init klog
	klog.InitFlags(defaultFlagSet)

	// Use default log level defined by the application
	_ = defaultFlagSet.Set("v", fmt.Sprintf("%d", log.LogLevelDefault))

	// Register reconcilers flag as function to allow dynamic validation
	flag.Func(
		"reconcilers",
		fmt.Sprintf("Comma delimited list of reconciler names. Available reconcilers: %s", types.Reconcilers()),
		setupReconcilersFlag,
	)
	reconcilers = types.Reconcilers()

	flag.Parse()
	klog.V(log.LogLevelMinimal).InfoS("configured log level", "v", LogLevel())
}

func createShardedReconcilerWorkersFlags(reconcilers types.ReconcilerList) map[types.Reconciler]*int {
	result := make(map[types.Reconciler]*int)

	for _, r := range reconcilers {
		result[r] = flag.Int(
			fmt.Sprintf("reconciler-%s-workers", r),
			types.DefaultShardedReconcilerWorkers,
			fmt.Sprintf("Number of workers for the %s reconciler.", r),
		)
	}

	return result
}

func ConsoleUrl() string {
	if len(*argConsoleUrl) == 0 {
		klog.Fatal("arg --console-url is required")
	}

	return *argConsoleUrl
}

func ConsoleToken() string {
	if len(*argConsoleToken) == 0 {
		klog.Fatal("arg --console-token is required")
	}

	return *argConsoleToken
}

func MetricsBindAddress() string {
	if len(*argMetricsBindAddress) == 0 {
		return defaultMetricsAddr
	}

	return *argMetricsBindAddress
}

func HealthProbeBindAddress() string {
	if len(*argHealthProbeBindAddress) == 0 {
		return defaultHealthProbeAddr
	}

	return *argHealthProbeBindAddress
}

func EnableLeaderElection() bool {
	return *argLeaderElect
}

func Reconcilers() types.ReconcilerList {
	return reconcilers
}

func WipeCacheInterval() time.Duration {
	if *argWipeCacheInterval <= 0 {
		return defaultWipeCacheInterval
	}

	return *argWipeCacheInterval
}

func Version() bool {
	return *argVersion
}

func LogLevel() klog.Level {
	v := lo.Ternary(flag.Lookup("v") != nil, flag.Lookup("v"), flag.Lookup("zap-log-level"))
	if v == nil {
		return log.LogLevelDefault
	}

	level, err := strconv.ParseInt(v.Value.String(), 10, 32)
	if err != nil {
		klog.ErrorS(err, "Could not parse log level", "level", v.Value.String(), "default", log.LogLevelDefault)
		return log.LogLevelDefault
	}

	return klog.Level(level)
}

func ShardedReconcilerWorkers(reconciler types.Reconciler) int {
	count, exists := shardedReconcilersWorkerConfigMap[reconciler]
	if !exists || count == nil || *count <= 0 {
		return types.DefaultShardedReconcilerWorkers
	}

	return *count
}
