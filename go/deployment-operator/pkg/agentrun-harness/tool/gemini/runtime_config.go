package gemini

import (
	"fmt"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	proxymodel "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/model"
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
	model := agent.resolveModel(gemini.Model)
	if run.IsProxyEnabled() {
		model = proxymodel.ProxyModel(console.AgentRuntimeTypeGemini, model)
	}
	provider := console.AiProviderVertex
	return toolv1.Settings{
		Mode:    run.Mode,
		Model:   toolv1.ModelSelection{Provider: &provider, Name: model},
		Timeout: gemini.Timeout,
		Proxy:   run.IsProxyEnabled(),
	}, nil
}

func (agent *Agent) resolveModelForSettings(config toolv1.Config, settings toolv1.Settings) string {
	model := settings.Model.Name
	if model == "" {
		model = config.Run.Runtime.Config.Gemini.Model
	}
	model = agent.resolveModel(model)
	if config.Run.IsProxyEnabled() {
		model = proxymodel.ProxyModel(console.AgentRuntimeTypeGemini, model)
	}
	return model
}

func (*Agent) validateMode(mode console.AgentRunMode) error {
	switch mode {
	case console.AgentRunModeAnalyze, console.AgentRunModeWrite, console.AgentRunModeReview:
		return nil
	default:
		return fmt.Errorf("unsupported gemini run mode %q", mode)
	}
}
