package opencode

import (
	"fmt"
	"strings"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	proxymodel "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/model"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/acp"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

// The default model is used when Console omits a model from an OpenCode run.
const defaultModel = "gpt-5.6-luna"

// Provider is an OpenCode provider id (https://models.dev).
type Provider string

const (
	// ProviderPlural routes requests through the Console AI proxy (/ext/ai/v1).
	ProviderPlural Provider = "plural"
	ProviderOpenAI Provider = "openai"

	// Common models.dev provider ids for direct (non-proxy) usage.
	ProviderAnthropic     Provider = "anthropic"
	ProviderAmazonBedrock Provider = "amazon-bedrock"
	ProviderGoogleVertex  Provider = "google-vertex"
	ProviderOllama        Provider = "ollama"
	ProviderAzure         Provider = "azure"
	ProviderXAI           Provider = "xai"

	// ProviderBedrock and ProviderVertex are legacy aliases accepted by the
	// Console provider contract in addition to the canonical models.dev IDs.
	ProviderBedrock Provider = "bedrock"
	ProviderVertex  Provider = "vertex"

	// ProviderOpenAICompatible is the fixed provider key for custom OpenAI-compatible endpoints.
	ProviderOpenAICompatible Provider = "openai-compatible"
)

type opencodeSettings struct {
	provider         Provider
	model            string
	openaiCompatible bool
}

// Console run modes map to these agent identifiers in OpenCode's ACP session.
const (
	analysisModeID = "analysis"
	reviewModeID   = "review"
	writeModeID    = "autonomous"
)

// resolveSettings selects provider/model wiring for opencode.json and ACP.
// The proxy branch stays separate so proxy behavior remains unchanged when
// OpenAI-compatible providers are configured.
func (*Agent) resolveSettings(provider, model string, openaiCompatible, proxyEnabled bool) opencodeSettings {
	if model == "" {
		model = defaultModel
	}

	if proxyEnabled {
		return opencodeSettings{
			provider: ProviderPlural,
			model:    proxymodel.ProxyModel(console.AgentRuntimeTypeOpencode, model),
		}
	}

	if openaiCompatible {
		return opencodeSettings{
			provider:         ProviderOpenAICompatible,
			model:            strings.TrimPrefix(model, string(ProviderOpenAICompatible)+"/"),
			openaiCompatible: true,
		}
	}

	selectedProvider := Provider(provider)
	if selectedProvider == "" {
		selectedProvider = ProviderPlural
	}

	return opencodeSettings{
		provider: selectedProvider,
		model:    strings.TrimPrefix(model, string(selectedProvider)+"/"),
	}
}

// ResolveSettings resolves provider/model defaults without copying credentials
// into the provider-neutral runtime settings.
func (agent *Agent) ResolveSettings(run *agentrunv1.AgentRun) (toolv1.Settings, error) {
	openCode, err := agent.runConfig(run)
	if err != nil {
		return toolv1.Settings{}, err
	}

	resolved := agent.resolveSettings(openCode.Provider, openCode.Model, openCode.OpenAICompatible, run.IsProxyEnabled())

	return toolv1.Settings{
		Mode: run.Mode,
		Model: toolv1.ModelSelection{
			Provider: agent.aiProvider(resolved.provider),
			Name:     resolved.model,
		},
		Timeout: openCode.Timeout,
		Proxy:   run.IsProxyEnabled(),
	}, nil
}

func (*Agent) aiProvider(provider Provider) *console.AiProvider {
	var mapped console.AiProvider
	switch strings.ToLower(string(provider)) {
	case string(ProviderPlural), string(ProviderOpenAI):
		mapped = console.AiProviderOpenai
	case string(ProviderAnthropic):
		mapped = console.AiProviderAnthropic
	case string(ProviderOllama):
		mapped = console.AiProviderOllama
	case string(ProviderAzure):
		mapped = console.AiProviderAzure
	case string(ProviderAmazonBedrock), string(ProviderBedrock):
		mapped = console.AiProviderBedrock
	case string(ProviderGoogleVertex), string(ProviderVertex):
		mapped = console.AiProviderVertex
	case string(ProviderOpenAICompatible):
		mapped = console.AiProviderOpenaiCompatible
	case string(ProviderXAI):
		mapped = console.AiProviderXai
	default:
		return nil
	}
	return &mapped
}

func (*Agent) runConfig(run *agentrunv1.AgentRun) (*agentrunv1.OpencodeConfig, error) {
	if run == nil {
		return nil, fmt.Errorf("agent run is not set")
	}
	if run.Runtime == nil || run.Runtime.Config == nil || run.Runtime.Config.OpenCode == nil {
		return nil, fmt.Errorf("opencode runtime configuration is not set")
	}
	return run.Runtime.Config.OpenCode, nil
}

func (transport *Transport) sessionSettings(settings toolv1.Settings) (acp.SessionSettings, error) {
	mode, err := transport.modeID(settings.Mode)
	if err != nil {
		return acp.SessionSettings{}, err
	}

	model := settings.Model.Name
	provider := transport.agent.resolveACPProvider(transport.agent.config)

	return acp.SessionSettings{ModeID: mode, ModelID: string(provider) + "/" + model}, nil
}

func (*Agent) resolveACPProvider(config toolv1.Config) Provider {
	openCode := config.Run.Runtime.Config.OpenCode
	if config.Run.IsProxyEnabled() {
		return ProviderPlural
	}
	if openCode.OpenAICompatible {
		return ProviderOpenAICompatible
	}
	if openCode.Provider == "" {
		return ProviderPlural
	}
	return Provider(openCode.Provider)
}

func (*Transport) modeID(mode console.AgentRunMode) (string, error) {
	switch mode {
	case console.AgentRunModeAnalyze:
		return analysisModeID, nil
	case console.AgentRunModeReview:
		return reviewModeID, nil
	case console.AgentRunModeWrite:
		return writeModeID, nil
	default:
		return "", fmt.Errorf("unsupported opencode ACP mode %q", mode)
	}
}
