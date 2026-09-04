package opencode

import (
	"strings"

	console "github.com/pluralsh/console/go/client"
	proxymodel "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/model"
)

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

// resolveSettings selects provider/model wiring for opencode.json and ACP.
// The aiProxy branch is kept separate so proxy behavior stays unchanged when openaiCompatible is added.
func (agent *Agent) resolveSettings(provider, model string, openaiCompatible, proxyEnabled bool) opencodeSettings {
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
