package pi

import (
	"fmt"
	"strings"

	"github.com/samber/lo"

	console "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	proxymodel "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/model"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

const defaultModel = "gpt-5.4"

const (
	providerPlural           = "plural"
	providerOpenAI           = "openai"
	providerOpenAICompatible = "openai-compatible"
	providerAnthropic        = "anthropic"
	providerOllama           = "ollama"
	providerAzure            = "azure-openai-responses"
	providerAmazonBedrock    = "amazon-bedrock"
	providerBedrock          = "bedrock"
	providerGoogleVertex     = "google-vertex"
	providerVertex           = "vertex"
	providerXAI              = "xai"
	openAIBaseURL            = "https://api.openai.com/v1"
	openAICompletionsAPI     = "openai-completions"
	openAIResponsesAPI       = "openai-responses"
)

type piSettings struct {
	provider string
	model    string
	method   string
	endpoint string
}

// ResolveSettings resolves Pi's model and timeout without exposing provider
// credentials to the provider-neutral runtime.
func (agent *Agent) ResolveSettings(run *agentrunv1.AgentRun) (toolv1.Settings, error) {
	pi, err := agent.runConfig(run)
	if err != nil {
		return toolv1.Settings{}, err
	}

	resolved := agent.resolveSettings(run, pi)
	provider := agent.aiProvider(resolved.provider)
	return toolv1.Settings{
		Mode: run.Mode,
		Model: toolv1.ModelSelection{
			Provider: provider,
			Name:     resolved.model,
		},
		Timeout: pi.Timeout,
		Proxy:   run.IsProxyEnabled(),
	}, nil
}

func (agent *Agent) resolveSettings(run *agentrunv1.AgentRun, config *agentrunv1.PiConfig) piSettings {
	model := config.Model
	if model == "" {
		model = defaultModel
	}

	provider := config.Provider
	if run.IsProxyEnabled() {
		return piSettings{
			provider: providerPlural,
			model:    proxymodel.ProxyModel(console.AgentRuntimeTypePi, model),
			method:   config.Method,
		}
	}

	if config.Endpoint != nil {
		provider = providerOpenAI
	}
	if provider == "" {
		provider = providerOpenAI
	}

	return piSettings{
		provider: provider,
		model:    agent.stripModelProvider(model, provider, config.Provider),
		method:   config.Method,
		endpoint: agent.openAIEndpoint(lo.FromPtr(config.Endpoint), provider, config.Method),
	}
}

func (*Agent) openAIAPI(method string) string {
	if console.OpenAiMethod(method) == console.OpenAiMethodChat {
		return openAICompletionsAPI
	}
	return openAIResponsesAPI
}

func (*Agent) openAIEndpoint(endpoint, provider, method string) string {
	if endpoint != "" {
		return endpoint
	}

	switch console.OpenAiMethod(method) {
	case console.OpenAiMethodChat, console.OpenAiMethodResponses:
		if provider == providerOpenAI {
			return openAIBaseURL
		}
	}
	return ""
}

func (agent *Agent) resolvedProvider(config toolv1.Config) string {
	pi, err := agent.runConfig(config.Run)
	if err != nil {
		return providerOpenAI
	}
	if config.Run.IsProxyEnabled() {
		return providerPlural
	}
	if pi.Endpoint != nil {
		return providerOpenAI
	}
	if pi.Provider == "" {
		return providerOpenAI
	}
	return pi.Provider
}

func (*Agent) stripModelProvider(model, provider, configuredProvider string) string {
	for _, prefix := range []string{provider, configuredProvider} {
		if prefix == "" {
			continue
		}
		model = strings.TrimPrefix(model, prefix+"/")
	}
	return model
}

func (*Agent) aiProvider(provider string) *console.AiProvider {
	var mapped console.AiProvider
	switch strings.ToLower(provider) {
	case providerPlural, providerOpenAI:
		mapped = console.AiProviderOpenai
	case providerAnthropic:
		mapped = console.AiProviderAnthropic
	case providerOllama:
		mapped = console.AiProviderOllama
	case providerAzure:
		mapped = console.AiProviderAzure
	case providerAmazonBedrock, providerBedrock:
		mapped = console.AiProviderBedrock
	case providerGoogleVertex, providerVertex:
		mapped = console.AiProviderVertex
	case providerOpenAICompatible:
		mapped = console.AiProviderOpenaiCompatible
	case providerXAI:
		mapped = console.AiProviderXai
	default:
		return nil
	}
	return &mapped
}

func (agent *Agent) nativeSettings(config toolv1.Config, model string) (piSettings, error) {
	pi, err := agent.runConfig(config.Run)
	if err != nil {
		return piSettings{}, err
	}
	resolved := agent.resolveSettings(config.Run, pi)
	if model == "" {
		model = resolved.model
	}
	resolved.model = model
	if config.Run.IsProxyEnabled() {
		resolved.endpoint = agent.proxyEndpoint(config.Run.IsStreamingProxyEnabled())
	}
	return resolved, nil
}

func (agent *Agent) proxyEndpoint(streaming bool) string {
	if streaming {
		return common.AgentOpenAIBaseURL
	}
	return fmt.Sprintf("%s/ext/ai/v1", agent.consoleURL)
}
