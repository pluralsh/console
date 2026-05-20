package model

import (
	"strings"

	console "github.com/pluralsh/console/go/client"
)

// ProxyProvider returns the upstream LLM provider slug for a runtime type when routing
// bare model names through the Plural AI proxy (provider/model format).
func ProxyProvider(runtimeType console.AgentRuntimeType) string {
	switch runtimeType {
	case console.AgentRuntimeTypeClaude:
		return "anthropic"
	case console.AgentRuntimeTypeCodex, console.AgentRuntimeTypeOpencode:
		return "openai"
	case console.AgentRuntimeTypeGemini:
		return "vertex"
	default:
		return ""
	}
}

// ProxyModel returns the model identifier to send through the Plural AI proxy.
// If model already includes a provider prefix (provider/model), it is returned unchanged.
// Otherwise, when a default provider exists for the runtime type, provider and model are joined.
func ProxyModel(runtimeType console.AgentRuntimeType, model string) string {
	model = strings.TrimSpace(model)
	if model == "" {
		return model
	}

	if strings.Contains(model, "/") {
		return model
	}

	provider := strings.TrimSpace(ProxyProvider(runtimeType))
	if provider == "" {
		return model
	}

	return provider + "/" + model
}
