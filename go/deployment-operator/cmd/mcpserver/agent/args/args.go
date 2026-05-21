package args

import (
	"flag"
	"fmt"
	"strconv"
	"strings"

	"github.com/spf13/pflag"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/internal/mcpserver/agent/tool"

	"github.com/pluralsh/console/go/deployment-operator/internal/controller"
	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const (
	EnvAddress     = "PLRL_MCP_ADDRESS"
	EnvGRPCAddress = "PLRL_MCP_GRPC_ADDRESS"

	EnvDeployToken  = "PLRL_DEPLOY_TOKEN"
	EnvExcludeTools = "PLRL_EXCLUDE_TOOLS"
)

var (
	argAddress      = pflag.String("address", helpers.GetEnv(EnvAddress, common.AgentMCPServerAddress), "Address to listen on")
	argGRPCAddress  = pflag.String("grpc-address", helpers.GetEnv(EnvGRPCAddress, common.AgentMCPGRPCServerAddress), "Address for internal babysit gRPC API listener")
	argConsoleUrl   = pflag.String("console-url", helpers.GetEnv(controller.EnvConsoleURL, ""), "URL to the Console, i.e. https://console.onplural.sh")
	argDeployToken  = pflag.String("deploy-token", helpers.GetEnv(EnvDeployToken, ""), "Deploy token to the Console API")
	argAgentRunID   = pflag.String("agent-run-id", helpers.GetEnv(controller.EnvAgentRunID, ""), "ID of the Agent Run being executed")
	argExcludeTools = pflag.String("exclude-tools", helpers.GetEnv(EnvExcludeTools, ""), "Comma-separated list of tools to exclude from the default set. Available tools: createBranch, agentPullRequest, fetchAgentRunTodos, updateAgentRunAnalysis, updateAgentRunTodos, downloadServiceManifests")
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

func Address() string {
	if argAddress == nil || len(*argAddress) == 0 {
		return common.AgentMCPServerAddress
	}

	return *argAddress
}

func GRPCAddress() string {
	if argGRPCAddress == nil || len(*argGRPCAddress) == 0 {
		return common.AgentMCPGRPCServerAddress
	}

	return *argGRPCAddress
}

func ConsoleURL() string {
	ensureOrDie("console-url", argConsoleUrl)
	consoleURL := *argConsoleUrl

	consoleURL = strings.TrimSuffix(consoleURL, "/ext/gql")
	consoleURL = strings.TrimSuffix(consoleURL, "/gql")
	consoleURL = strings.TrimSuffix(consoleURL, "/")

	return consoleURL
}

func ConsoleExtApiURL() string {
	return fmt.Sprintf("%s/ext/gql", ConsoleURL())
}

func AgentRunID() string {
	ensureOrDie("agent-run-id", argAgentRunID)
	return *argAgentRunID
}

func DeployToken() string {
	ensureOrDie("deploy-token", argDeployToken)
	return *argDeployToken
}

func ExcludeTools() ([]tool.ID, error) {
	if argExcludeTools == nil || len(*argExcludeTools) == 0 {
		return nil, nil
	}

	inputTools := strings.Split(*argExcludeTools, ",")
	result := make([]tool.ID, 0, len(inputTools))
	for i, t := range inputTools {
		inputTools[i] = strings.TrimSpace(t)
		if inputTools[i] == "" {
			continue
		}

		toolID, err := tool.ToID(inputTools[i])
		if err != nil {
			return nil, err
		}

		result = append(result, toolID)
	}

	return result, nil
}

func LogLevel() klog.Level {
	v := pflag.Lookup("v")
	if v == nil {
		return log.LogLevelDefault
	}

	level, err := strconv.ParseInt(v.Value.String(), 10, 32)
	if err != nil {
		klog.ErrorS(err, "could not parse log level", "level", v.Value.String(), "default", log.LogLevelDefault)
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
