package args

import (
	"flag"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/pflag"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

const (
	EnvConsoleUrl  = "CONSOLE_URL"
	EnvDeployToken = "DEPLOY_TOKEN"
	EnvAgentRunID  = "AGENT_RUN_ID"

	defaultWorkingDir = "agentrun"

	// Defaults to 60 minute for agent run cancellation (shorter than stack runs)
	defaultTimeout         = "60m"
	defaultTimeoutDuration = 60 * time.Minute

	// Log related defaults
	defaultLogFlushFrequency         = "5s"
	defaultLogFlushFrequencyDuration = 5 * time.Second
	defaultLogFlushBufferSize        = "4096"
)

var (
	argConsoleUrl         = pflag.String("console-url", helpers.GetPluralEnv(EnvConsoleUrl, ""), "URL to the extended Console API, i.e. https://console.onplural.sh/ext/gql")
	argDeployToken        = pflag.String("deploy-token", helpers.GetPluralEnv(EnvDeployToken, ""), "Deploy token to the Console API")
	argAgentRunID         = pflag.String("agent-run-id", helpers.GetPluralEnv(EnvAgentRunID, ""), "ID of the Agent Run to execute")
	argWorkingDir         = pflag.String("working-dir", defaultWorkingDir, "Working directory used to prepare the environment")
	argTimeout            = pflag.String("timeout", defaultTimeout, "Timeout is the maximum time the agent run can run before it will be cancelled")
	argLogFlushFrequency  = pflag.String("log-flush-frequency", defaultLogFlushFrequency, "Frequency at which logs should be flushed if buffer is not full")
	argLogFlushBufferSize = pflag.Int("log-flush-buffer-size", helpers.ParseIntOrDie(defaultLogFlushBufferSize), "Buffer size to use for log flushing (in kilobytes)")
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

	if strings.HasSuffix(*argConsoleUrl, "/ext/gql") {
		return strings.TrimSuffix(*argConsoleUrl, "/ext/gql")
	}

	if strings.HasSuffix(*argConsoleUrl, "/gql") {
		return strings.TrimSuffix(*argConsoleUrl, "/gql")
	}

	return *argConsoleUrl
}

func ConsoleAPIUrl() string {
	ensureOrDie("console-url", argConsoleUrl)

	return fmt.Sprintf("%s/ext/gql", ConsoleUrl())
}

func DeployToken() string {
	ensureOrDie("deploy-token", argDeployToken)

	return *argDeployToken
}

func AgentRunID() string {
	ensureOrDie("agent-run-id", argAgentRunID)

	return *argAgentRunID
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

func WorkingDir() string {
	return *argWorkingDir
}

func Timeout() time.Duration {
	timeout, err := time.ParseDuration(*argTimeout)
	if err != nil {
		klog.ErrorS(err, "Could not parse timeout", "timeout", *argTimeout, "default", defaultTimeout)
		return defaultTimeoutDuration
	}

	return timeout
}

func LogFlushFrequency() time.Duration {
	frequency, err := time.ParseDuration(*argLogFlushFrequency)
	if err != nil {
		klog.ErrorS(err, "Could not parse log-flush-frequency", "frequency", *argLogFlushFrequency, "default", defaultLogFlushFrequencyDuration)
		return defaultLogFlushFrequencyDuration
	}

	return frequency
}

func LogFlushBufferSize() int {
	return *argLogFlushBufferSize
}

func ensureOrDie(argName string, arg *string) {
	if arg == nil || len(*arg) == 0 {
		pflag.PrintDefaults()
		panic(fmt.Sprintf("%s arg is required", argName))
	}
}
