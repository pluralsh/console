package args

import (
	"flag"
	"fmt"
	"strconv"
	"strings"

	"github.com/spf13/pflag"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const (
	EnvConsoleURL  = "CONSOLE_URL"
	EnvDeployToken = "DEPLOY_TOKEN"
	EnvAgentRunID  = "AGENT_RUN_ID"
	EnvWorkingDir  = "WORKING_DIR"
)

var (
	argConsoleURL  = pflag.String("console-url", helpers.GetPluralEnv(EnvConsoleURL, ""), "URL to the Console API, i.e. https://console.onplural.sh/ext/gql")
	argDeployToken = pflag.String("deploy-token", helpers.GetPluralEnv(EnvDeployToken, ""), "Deploy token to the Console API")
	argAgentRunID  = pflag.String("agent-run-id", helpers.GetPluralEnv(EnvAgentRunID, ""), "ID of the Agent Run being executed")
	argWorkingDir  = pflag.String("working-dir", helpers.GetPluralEnv(EnvWorkingDir, common.AgentRunSharedWorkDir), "Working directory used to prepare repository for shared pod workspace")
)

func init() {
	fs := flag.NewFlagSet("", flag.PanicOnError)
	klog.InitFlags(fs)
	_ = fs.Set("v", fmt.Sprintf("%d", log.LogLevelDefault))
	pflag.CommandLine.AddGoFlagSet(fs)
	pflag.Parse()
}

func ConsoleURL() string {
	ensureOrDie("console-url", argConsoleURL)
	consoleURL := *argConsoleURL

	consoleURL = strings.TrimSuffix(consoleURL, "/ext/gql")
	consoleURL = strings.TrimSuffix(consoleURL, "/gql")
	consoleURL = strings.TrimSuffix(consoleURL, "/")

	return consoleURL
}

func ConsoleApiURL() string {
	return fmt.Sprintf("%s/ext/gql", ConsoleURL())
}

func DeployToken() string {
	ensureOrDie("deploy-token", argDeployToken)
	return *argDeployToken
}

func AgentRunID() string {
	ensureOrDie("agent-run-id", argAgentRunID)
	return *argAgentRunID
}

func WorkingDir() string {
	if argWorkingDir == nil || len(*argWorkingDir) == 0 {
		return common.AgentRunSharedWorkDir
	}

	return *argWorkingDir
}

func LogLevel() klog.Level {
	v := pflag.Lookup("v")
	if v == nil {
		return log.LogLevelDefault
	}

	level, err := strconv.ParseInt(v.Value.String(), 10, 32)
	if err != nil {
		return log.LogLevelDefault
	}

	return klog.Level(level)
}

func ensureOrDie(argName string, arg *string) {
	if arg == nil || len(*arg) == 0 {
		pflag.PrintDefaults()
		panic(fmt.Sprintf("%s arg is required", argName))
	}
}
