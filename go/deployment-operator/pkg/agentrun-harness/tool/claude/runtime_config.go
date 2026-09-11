package claude

import (
	"fmt"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

const defaultModel = "claude-sonnet-5"

const (
	defaultModeID = "default"
	bypassModeID  = "bypassPermissions"
)

func (*Agent) resolveModel(model string) string {
	if model == "" {
		return defaultModel
	}
	return model
}

func (agent *Agent) ResolveSettings(run *agentrunv1.AgentRun) (toolv1.Settings, error) {
	claude, err := agent.runConfig(run)
	if err != nil {
		return toolv1.Settings{}, err
	}
	model := agent.resolveModel(claude.Model)
	provider := console.AiProviderAnthropic
	return toolv1.Settings{Mode: run.Mode, Model: toolv1.ModelSelection{Provider: &provider, Name: model}, Timeout: claude.Timeout, Proxy: run.IsProxyEnabled()}, nil
}

func (*Agent) modeID(mode console.AgentRunMode) (string, error) {
	switch mode {
	case console.AgentRunModeAnalyze, console.AgentRunModeReview:
		return defaultModeID, nil
	case console.AgentRunModeWrite:
		return bypassModeID, nil
	default:
		return "", fmt.Errorf("unsupported claude ACP mode %q", mode)
	}
}
