package v1alpha1

import (
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

// modelAttributes infers Console model attribution from the runtime's configured
// model. This is only possible when aiProxy is enabled, because that is the only
// path that fully routes LLM calls through Plural.
//
// Provider and slug come from `{provider}/{slug}` when present. A bare model id
// uses the same default provider mapping as the AI proxy harness.
func (in *AgentRuntime) modelAttributes() *console.WorkbenchJobModelAttributes {
	if !in.IsAiProxyEnabled() {
		return nil
	}

	model := strings.TrimSpace(in.configuredModel())
	if model == "" {
		return nil
	}

	providerSlug, modelSlug := splitConfiguredModel(model)
	if modelSlug == "" {
		return nil
	}
	if providerSlug == "" {
		providerSlug = defaultModelProvider(in.Spec.Type)
	}
	if providerSlug == "" {
		return nil
	}

	provider, ok := aiProviderFromSlug(providerSlug)
	if !ok {
		return nil
	}

	return &console.WorkbenchJobModelAttributes{
		Provider: provider,
		Model:    modelSlug,
	}
}

func (in *AgentRuntime) configuredModel() string {
	if in == nil || in.Spec.Config == nil {
		return ""
	}

	switch in.Spec.Type {
	case console.AgentRuntimeTypeClaude:
		return lo.FromPtr(lo.FromPtr(in.Spec.Config.Claude).Model)
	case console.AgentRuntimeTypeOpencode:
		return lo.FromPtr(lo.FromPtr(in.Spec.Config.OpenCode).Model)
	case console.AgentRuntimeTypeGemini:
		return lo.FromPtr(lo.FromPtr(in.Spec.Config.Gemini).Model)
	case console.AgentRuntimeTypeCodex:
		return lo.FromPtr(lo.FromPtr(in.Spec.Config.Codex).Model)
	case console.AgentRuntimeTypePi:
		return lo.FromPtr(lo.FromPtr(in.Spec.Config.Pi).Model)
	default:
		return ""
	}
}

func splitConfiguredModel(model string) (provider, slug string) {
	provider, slug, found := strings.Cut(strings.TrimSpace(model), "/")
	if !found {
		return "", strings.TrimSpace(model)
	}

	return strings.TrimSpace(provider), strings.TrimSpace(slug)
}

// defaultModelProvider matches pkg/agentrun-harness/model.ProxyProvider.
func defaultModelProvider(runtimeType console.AgentRuntimeType) string {
	switch runtimeType {
	case console.AgentRuntimeTypeClaude:
		return "anthropic"
	case console.AgentRuntimeTypeCodex, console.AgentRuntimeTypeOpencode, console.AgentRuntimeTypePi:
		return "openai"
	case console.AgentRuntimeTypeGemini:
		return "vertex"
	default:
		return ""
	}
}

func aiProviderFromSlug(slug string) (console.AiProvider, bool) {
	normalized := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(slug), "-", "_"))
	switch normalized {
	case "openai":
		return console.AiProviderOpenai, true
	case "anthropic":
		return console.AiProviderAnthropic, true
	case "ollama":
		return console.AiProviderOllama, true
	case "azure":
		return console.AiProviderAzure, true
	case "bedrock":
		return console.AiProviderBedrock, true
	case "vertex":
		return console.AiProviderVertex, true
	case "openai_compatible":
		return console.AiProviderOpenaiCompatible, true
	case "xai":
		return console.AiProviderXai, true
	default:
		return "", false
	}
}
