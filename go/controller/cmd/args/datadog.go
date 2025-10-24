package args

import (
	"flag"
	"fmt"
	"time"

	"github.com/DataDog/dd-trace-go/v2/ddtrace/tracer"
	"github.com/DataDog/dd-trace-go/v2/profiler"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"k8s.io/klog/v2"
)

const (
	defaultDatadog     = false
	defaultDatadogHost = "datadog-agent.monitoring.svc.cluster.local"
	defaultDatadogEnv  = "plrl-dev-aws"
)

var (
	argDatadog = flag.Bool("datadog", utils.GetPluralEnvBool("DATADOG_ENABLED", defaultDatadog),
		"Enable datadog integration for detailed application profiling. "+
			"By default it will push to http://datadog.monitoring.svc.cluster.local:8125")
	argDatadogHost = flag.String("datadog-host", defaultDatadogHost, "The address of the Datadog server.")
	argDatadogEnv  = flag.String("datadog-env", defaultDatadogEnv, "The environment of the Datadog server.")
)

func DatadogEnabled() bool {
	return *argDatadog
}

func DatadogHost() string {
	return *argDatadogHost
}

func DatadogStatsdAddr() string {
	return fmt.Sprintf("%s:8125", DatadogHost())
}

func DatadogAgentAddr() string {
	return fmt.Sprintf("%s:8126", DatadogHost())
}

func DatadogEnv() string {
	return *argDatadogEnv
}

func InitDatadog() error {
	klog.Info("initializing datadog")

	service := "console-controller"

	if err := tracer.Start(
		tracer.WithLogStartup(false),
		tracer.WithAppSecEnabled(false),
		tracer.WithDebugMode(false),
		tracer.WithRuntimeMetrics(),
		tracer.WithDogstatsdAddr(DatadogStatsdAddr()),
		tracer.WithAgentAddr(DatadogAgentAddr()),
		tracer.WithService(service),
		tracer.WithEnv(DatadogEnv()),
	); err != nil {
		return err
	}

	return profiler.Start(
		profiler.WithService(service),
		profiler.WithEnv(DatadogEnv()),
		profiler.WithTags(fmt.Sprintf("console_url:%s", ConsoleUrl())),
		profiler.WithAgentAddr(DatadogAgentAddr()),
		profiler.WithPeriod(30*time.Second),
		profiler.CPUDuration(30*time.Second),
		profiler.WithProfileTypes(profiler.CPUProfile, profiler.HeapProfile),
	)
}
