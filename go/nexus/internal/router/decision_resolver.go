package router

import (
	"slices"
	"strings"

	"github.com/maximhq/bifrost/core/schemas"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
)

// AutoDecisionModel asks nexus to pick the decision model from the configured providers.
const AutoDecisionModel = "auto"

var (
	// decisionProviderPriorityList orders providers when no decision provider is configured.
	decisionProviderPriorityList = []schemas.ModelProvider{
		schemas.OpenAI, schemas.Azure, schemas.Anthropic, schemas.Vertex, schemas.Bedrock, openAICompatibleProvider, schemas.XAI,
	}

	// nativeDecisionProviders serve POST /v1/decisions themselves, so only their decision models are sent natively.
	// Everything else is emulated through the provider's responses API.
	nativeDecisionProviders = []schemas.ModelProvider{schemas.OpenAI, schemas.Azure}
)

// decisionTarget is one provider/model a decision request is attempted on.
type decisionTarget struct {
	Provider schemas.ModelProvider
	Model    string
	Emulate  bool
}

type decisionModels struct {
	decision, model, tool string
}

// decisionTargets returns, in order: the configured decision provider's models, every provider's decision model,
// then the default provider's completion models as a last resort.
func decisionTargets(cfg *pb.AiConfig) []decisionTarget {
	if cfg == nil || !cfg.GetEnabled() {
		return nil
	}

	var targets []decisionTarget
	add := func(provider schemas.ModelProvider, model string) {
		if provider == "" || model == "" {
			return
		}
		t := decisionTarget{Provider: provider, Model: model, Emulate: !nativeDecisionModel(cfg, provider, model)}
		if !slices.Contains(targets, t) {
			targets = append(targets, t)
		}
	}

	if provider := consoleProvider(cfg, cfg.GetDecisionProvider()); provider != "" {
		m := providerDecisionModels(cfg, provider)
		add(provider, m.decision)
		add(provider, m.model)
		add(provider, m.tool)
	}

	for _, provider := range decisionProviderPriorityList {
		provider = canonicalDecisionProvider(cfg, provider)
		add(provider, providerDecisionModels(cfg, provider).decision)
	}

	if provider := consoleProvider(cfg, cfg.GetProvider()); provider != "" {
		m := providerDecisionModels(cfg, provider)
		add(provider, m.model)
		add(provider, m.tool)
	}

	return targets
}

// explicitDecisionTargets serves a request naming its model: native providers get the model natively first, then
// emulated in case it isn't a decision model.
func explicitDecisionTargets(provider schemas.ModelProvider, model string) []decisionTarget {
	if slices.Contains(nativeDecisionProviders, provider) {
		return []decisionTarget{{Provider: provider, Model: model}, {Provider: provider, Model: model, Emulate: true}}
	}
	return []decisionTarget{{Provider: provider, Model: model, Emulate: true}}
}

func nativeDecisionModel(cfg *pb.AiConfig, provider schemas.ModelProvider, model string) bool {
	return slices.Contains(nativeDecisionProviders, provider) && providerDecisionModels(cfg, provider).decision == model
}

// consoleProvider maps console's ai provider names onto bifrost providers. Unconfigured or unsupported providers map to "".
func consoleProvider(cfg *pb.AiConfig, name string) schemas.ModelProvider {
	var provider schemas.ModelProvider
	switch strings.ToLower(name) {
	case "openai":
		provider = schemas.OpenAI
	case "openai_compatible":
		provider = openAICompatibleProvider
	case "xai":
		provider = schemas.XAI
	case "anthropic":
		provider = schemas.Anthropic
	case "vertex":
		provider = schemas.Vertex
	case "bedrock":
		provider = schemas.Bedrock
	case "azure":
		provider = schemas.Azure
	default:
		return ""
	}
	return canonicalDecisionProvider(cfg, provider)
}

func canonicalDecisionProvider(cfg *pb.AiConfig, provider schemas.ModelProvider) schemas.ModelProvider {
	if provider == schemas.Bedrock && cfg.GetBedrock() != nil {
		return bedrockProvider(cfg.GetBedrock())
	}
	return provider
}

func providerDecisionModels(cfg *pb.AiConfig, provider schemas.ModelProvider) decisionModels {
	openai := func(c *pb.OpenAiConfig) decisionModels {
		if c == nil {
			return decisionModels{}
		}
		return decisionModels{decision: c.GetDecisionModel(), model: c.GetModel(), tool: c.GetToolModel()}
	}

	switch provider {
	case schemas.OpenAI:
		return openai(cfg.GetOpenai())
	case openAICompatibleProvider:
		return openai(cfg.GetOpenaiCompatible())
	case schemas.XAI:
		return openai(cfg.GetXai())
	case schemas.Anthropic:
		if c := cfg.GetAnthropic(); c != nil {
			return decisionModels{decision: c.GetDecisionModel(), model: c.GetModel(), tool: c.GetToolModel()}
		}
	case schemas.Vertex:
		if c := cfg.GetVertexAi(); c != nil {
			return decisionModels{decision: c.GetDecisionModel(), model: c.GetModel(), tool: c.GetToolModel()}
		}
	case schemas.Azure:
		if c := cfg.GetAzure(); c != nil {
			return decisionModels{decision: c.GetDecisionModel(), model: c.GetModel(), tool: c.GetToolModel()}
		}
	case schemas.Bedrock:
		if c := cfg.GetBedrock(); c != nil {
			return decisionModels{decision: bedrockModelName(c.GetDecisionModelId()), model: bedrockModelName(c.GetModelId()), tool: bedrockModelName(c.GetToolModelId())}
		}
	case schemas.BedrockMantle:
		if c := cfg.GetBedrock(); c != nil {
			return decisionModels{decision: c.GetDecisionModelId(), model: c.GetModelId(), tool: c.GetToolModelId()}
		}
	}
	return decisionModels{}
}

// bedrockProfileGeos are the geography prefixes of AWS cross-region inference profile IDs.
var bedrockProfileGeos = map[string]bool{
	"us": true, "us-gov": true, "eu": true, "apac": true, "jp": true, "au": true, "ca": true, "global": true,
}

// bedrockModelName is the client-facing model registered for a Bedrock runtime model or cross-region inference
// profile ID (<geo>.<provider>.<model>).  Model IDs may themselves contain dots (openai.gpt-5.6), so only a known
// geography prefix marks a profile.
func bedrockModelName(modelID string) string {
	if geo, model, ok := strings.Cut(modelID, "."); ok && bedrockProfileGeos[geo] && strings.Contains(model, ".") {
		return model
	}
	return modelID
}
