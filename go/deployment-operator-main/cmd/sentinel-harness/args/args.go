package args

import (
	"flag"
	"fmt"
	"strconv"
	"time"

	"github.com/spf13/pflag"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

const (
	EnvConsoleUrl    = "CONSOLE_URL"
	EnvConsoleToken  = "CONSOLE_TOKEN"
	EnvSentinelRunID = "SENTINEL_RUN_ID"
	EnvTestDir       = "TEST_DIR"
	EnvOutputDir     = "OUTPUT_DIR"
	EnvTimeout       = "TIMEOUT"
	EnvOutputFormat  = "OUTPUT_FORMAT"

	defaultTestDir   = "/sentinel"
	defaultOutputDir = "/plural"

	// Defaults to 30 minutes for run cancellation
	defaultTimeout         = "30m"
	defaultTimeoutDuration = 30 * time.Minute
	defaultOutputFormat    = "JUNIT"
)

var (
	argConsoleUrl    = pflag.String("console-url", helpers.GetPluralEnv(EnvConsoleUrl, ""), "URL to the extended Console API, i.e. https://console.onplural.sh/ext/gql")
	argConsoleToken  = pflag.String("console-token", helpers.GetPluralEnv(EnvConsoleToken, ""), "Deploy token to the Console API")
	argSentinelRunID = pflag.String("sentinel-run-id", helpers.GetPluralEnv(EnvSentinelRunID, ""), "ID of the Sentinel Run to execute")
	argTestDir       = pflag.String("test-dir", helpers.GetPluralEnv(EnvTestDir, defaultTestDir), "Test directory used to run sentinel tests from")
	argOutputDir     = pflag.String("output-dir", helpers.GetPluralEnv(EnvOutputDir, defaultOutputDir), "Output directory used to store test results")
	argTimeout       = pflag.String("timeout", helpers.GetPluralEnv(EnvTimeout, defaultTimeout), "Timeout is the maximum time each sentinel run step can run before it will be cancelled")
	argOutputFormat  = pflag.String("output-format", helpers.GetPluralEnv(EnvOutputFormat, defaultOutputFormat), "Output format to use for test results (options: JUNIT, PLAINTEXT)")
)

func init() {
	// Init klog
	fs := flag.NewFlagSet("", flag.PanicOnError)
	klog.InitFlags(fs)

	// Use default log level defined by the application
	_ = fs.Set("v", fmt.Sprintf("%d", log.LogLevelDefault))

	pflag.CommandLine.AddGoFlagSet(fs)
	pflag.Parse()

	klog.V(log.LogLevelMinimal).InfoS("configured log level", "v", LogLevel())
}

func ConsoleUrl() string {
	ensureOrDie("console-url", argConsoleUrl)

	return *argConsoleUrl
}

func ConsoleToken() string {
	ensureOrDie("console-token", argConsoleToken)

	return *argConsoleToken
}

func SentinelRunID() string {
	ensureOrDie("sentinel-run-id", argSentinelRunID)

	return *argSentinelRunID
}

func LogLevel() klog.Level {
	v := pflag.Lookup("v")
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

func TestDir() string {
	return *argTestDir
}

func OutputDir() string {
	return *argOutputDir
}

func Timeout() time.Duration {
	timeout, err := time.ParseDuration(*argTimeout)
	if err != nil {
		klog.ErrorS(err, "Could not parse timeout", "timeout", *argTimeout, "default", defaultTimeout)
		return defaultTimeoutDuration
	}

	return timeout
}

func TimeoutDuration() string { return *argTimeout }

func OutputFormat() string { return *argOutputFormat }

func ensureOrDie(argName string, arg *string) {
	if arg == nil || len(*arg) == 0 {
		pflag.PrintDefaults()
		panic(fmt.Sprintf("%s arg is required", argName))
	}
}
