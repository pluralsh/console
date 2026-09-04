package codex

import (
	"fmt"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	proxymodel "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/model"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

// These fallbacks keep Codex runs deterministic when Console omits model or
// ACP reasoning settings.
const (
	defaultModel     = "gpt-5.6-luna"
	defaultReasoning = "medium"
)

// Console run modes map to these profile names in Codex's native config.
const (
	analysisProfile   = "analysis"
	autonomousProfile = "autonomous"
	reviewProfile     = "review"
)

// These provider keys, endpoint, and wire labels are serialized into Codex's
// model provider configuration for direct, custom, and proxied requests.
const (
	pluralProvider   = "plural"
	customProvider   = "custom"
	openAIProvider   = "openai-api"
	openAIBaseURL    = "https://api.openai.com/v1"
	chatWireAPI      = "chat"
	responsesWireAPI = "responses"
)

// All supported Console run modes use Codex's full-access ACP mode; the
// agent-run pod remains the isolation boundary.
const acpModeID = "agent-full-access"

func (*Agent) resolveModel(model string) string {
	if model == "" {
		return defaultModel
	}
	return model
}

// ResolveSettings resolves Codex's model and timeout without exposing
// credentials to the provider-neutral runtime settings.
func (agent *Agent) ResolveSettings(run *agentrunv1.AgentRun) (toolv1.Settings, error) {
	codex, err := agent.runConfig(run)
	if err != nil {
		return toolv1.Settings{}, err
	}

	config := toolv1.Config{Run: run}
	model := agent.resolveModelForSettings(config, toolv1.Settings{})
	provider := console.AiProviderOpenai

	return toolv1.Settings{
		Mode: run.Mode,
		Model: toolv1.ModelSelection{
			Provider:  &provider,
			Name:      model,
			Reasoning: agent.resolveReasoning(toolv1.Settings{}),
		},
		Timeout: codex.Timeout,
		Proxy:   run.IsProxyEnabled(),
	}, nil
}

func (agent *Agent) resolveModelForSettings(config toolv1.Config, settings toolv1.Settings) string {
	codex := config.Run.Runtime.Config.Codex

	model := settings.Model.Name
	if model == "" {
		model = codex.Model
	}
	model = agent.resolveModel(model)

	if config.Run.IsProxyEnabled() {
		model = proxymodel.ProxyModel(console.AgentRuntimeTypeCodex, model)
	}
	return model
}

func (*Agent) resolveReasoning(settings toolv1.Settings) string {
	reasoning := settings.Model.Reasoning
	if reasoning == "" {
		reasoning = defaultReasoning
	}
	return reasoning
}

func (agent *Agent) resolveACPSettings(settings toolv1.Settings) (string, string, string, error) {
	modeID, err := agent.resolveACPMode(settings.Mode, "")
	if err != nil {
		return "", "", "", err
	}

	return settings.Model.Name, agent.resolveReasoning(settings), modeID, nil
}

func (agent *Agent) resolveACPProvider(config toolv1.Config) string {
	if config.Run.IsProxyEnabled() {
		return pluralProvider
	}
	if config.Run.Runtime.Config.Codex.Endpoint != nil {
		return customProvider
	}
	if agent.wireAPI(config.Run.Runtime.Config.Codex.Method) == "" {
		return ""
	}
	return openAIProvider
}

func (agent *Agent) resolveProviderSettings(config toolv1.Config) (string, string, string, string) {
	wireAPI := agent.wireAPI(config.Run.Runtime.Config.Codex.Method)
	if config.Run.IsProxyEnabled() {
		baseURL := fmt.Sprintf("%s/ext/ai/v1", agent.consoleURL)
		if config.Run.IsStreamingProxyEnabled() {
			baseURL = common.AgentOpenAIBaseURL
		}
		return pluralProvider, baseURL, consoleTokenEnv, wireAPI
	}
	if endpoint := config.Run.Runtime.Config.Codex.Endpoint; endpoint != nil {
		return customProvider, *endpoint, openAIAPIKeyEnv, wireAPI
	}
	if wireAPI == "" {
		return "", "", "", ""
	}
	return openAIProvider, openAIBaseURL, openAIAPIKeyEnv, wireAPI
}

func (*Agent) profileForMode(mode console.AgentRunMode) (string, bool) {
	switch mode {
	case console.AgentRunModeAnalyze:
		return analysisProfile, true
	case console.AgentRunModeWrite:
		return autonomousProfile, true
	case console.AgentRunModeReview:
		return reviewProfile, true
	default:
		return "", false
	}
}

func (*Agent) wireAPI(method string) string {
	switch console.OpenAiMethod(method) {
	case console.OpenAiMethodChat:
		return chatWireAPI
	case console.OpenAiMethodResponses:
		return responsesWireAPI
	default:
		return ""
	}
}

func (*Agent) resolveACPMode(mode, fallback console.AgentRunMode) (string, error) {
	if mode == "" {
		mode = fallback
	}
	switch mode {
	case console.AgentRunModeAnalyze, console.AgentRunModeWrite, console.AgentRunModeReview:
		return acpModeID, nil
	default:
		return "", fmt.Errorf("unsupported codex ACP mode %q", mode)
	}
}
