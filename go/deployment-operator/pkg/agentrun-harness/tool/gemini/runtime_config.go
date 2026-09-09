package gemini

import (
	"fmt"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

const defaultModel = "gemini-3.5-flash"

func (*Agent) resolveModel(model string) string {
	if model == "" {
		return defaultModel
	}
	return model
}

func (agent *Agent) ResolveSettings(run *agentrunv1.AgentRun) (toolv1.Settings, error) {
	gemini, err := agent.runConfig(run)
	if err != nil {
		return toolv1.Settings{}, err
	}
	return toolv1.Settings{
		Mode:    run.Mode,
		Model:   toolv1.ModelSelection{Name: agent.resolveModel(gemini.Model)},
		Timeout: gemini.Timeout,
		Proxy:   run.IsProxyEnabled(),
	}, nil
}

func (*Agent) validateMode(mode console.AgentRunMode) error {
	switch mode {
	case console.AgentRunModeAnalyze, console.AgentRunModeWrite, console.AgentRunModeReview:
		return nil
	default:
		return fmt.Errorf("unsupported gemini ACP mode %q", mode)
	}
}
