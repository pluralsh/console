package router

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/maximhq/bifrost/core/providers/openai"
	"github.com/maximhq/bifrost/core/schemas"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
)

const (
	nexusChatToResponsesStreamStateKey schemas.BifrostContextKey = "nexus-chat-to-responses-stream-state"
)

// openAIHTTPPolicy controls which OpenAI-compatible HTTP routes Nexus exposes and
// whether cross-format fallbacks are required.
type openAIHTTPPolicy struct {
	allowChat      bool
	allowResponses bool
}

func openAIHTTPPolicyFromConfig(cfg *pb.OpenAiConfig) openAIHTTPPolicy {
	policy := openAIHTTPPolicy{allowChat: true, allowResponses: true}
	if cfg == nil {
		return policy
	}

	switch cfg.GetMethod() {
	case pb.OpenAiMethod_CHAT:
		policy.allowResponses = false
	case pb.OpenAiMethod_RESPONSES:
		policy.allowChat = false
	default:
		// AUTO and unset method: both allowed natively
	}

	return policy
}

func (p openAIHTTPPolicy) responsesViaChat() bool {
	return p.allowChat && !p.allowResponses
}

func (p openAIHTTPPolicy) chatViaResponses() bool {
	return p.allowResponses && !p.allowChat
}

func (p openAIHTTPPolicy) allowsRoute(path string) bool {
	switch path {
	case string(RouteChatCompletions):
		return p.allowChat
	case string(RouteResponses):
		return p.allowResponses
	default:
		return true
	}
}

func applyOpenAIRoutingContext(ctx *schemas.BifrostContext, path string, policy openAIHTTPPolicy) {
	switch path {
	case string(RouteResponses):
		if policy.responsesViaChat() {
			ctx.SetValue(schemas.BifrostContextKeyIsResponsesToChatCompletionFallback, true)
		}
	case string(RouteChatCompletions):
		if policy.chatViaResponses() {
			// Bifrost core converts chat requests to the responses API (and back) for both
			// streaming and non-streaming calls when this key is set.
			ctx.SetValue(schemas.BifrostContextKeyChangeRequestType, schemas.ResponsesRequest)
		}
	}
}

func responsesViaChat(ctx *schemas.BifrostContext) bool {
	v, ok := ctx.Value(schemas.BifrostContextKeyIsResponsesToChatCompletionFallback).(bool)
	return ok && v
}

func chatViaResponses(ctx *schemas.BifrostContext) bool {
	changeType, ok := ctx.Value(schemas.BifrostContextKeyChangeRequestType).(schemas.RequestType)
	return ok && changeType == schemas.ResponsesRequest
}

func chatToResponsesStreamState(ctx *schemas.BifrostContext) *schemas.ChatToResponsesStreamState {
	if state, ok := ctx.Value(nexusChatToResponsesStreamStateKey).(*schemas.ChatToResponsesStreamState); ok && state != nil {
		return state
	}

	state := schemas.AcquireChatToResponsesStreamState()
	ctx.SetValue(nexusChatToResponsesStreamStateKey, state)
	return state
}

func releaseChatToResponsesStreamState(ctx *schemas.BifrostContext) {
	state, ok := ctx.Value(nexusChatToResponsesStreamStateKey).(*schemas.ChatToResponsesStreamState)
	if !ok || state == nil {
		return
	}
	schemas.ReleaseChatToResponsesStreamState(state)
	ctx.SetValue(nexusChatToResponsesStreamStateKey, nil)
}

func (in *OpenAIRouter) openAIRoutePreCallback(path string) PreRequestCallback {
	return func(request *http.Request, bifrostCtx *schemas.BifrostContext, req interface{}) error {
		aiConfig, err := in.consoleClient.GetAiConfig(request.Context())
		if err != nil {
			return fmt.Errorf("failed to load AI config: %w", err)
		}

		cfg := aiConfig.GetOpenai()
		if model := openAIRequestModel(req); model != "" {
			cfg = openAIConfigForRequestModel(aiConfig, model)
		}

		applyOpenAIRoutingContext(bifrostCtx, path, openAIHTTPPolicyFromConfig(cfg))
		return nil
	}
}

func openAIConfigForRequestModel(aiConfig *pb.AiConfig, model string) *pb.OpenAiConfig {
	parts := strings.SplitN(strings.TrimSpace(model), "/", 2)
	if len(parts) != 2 || parts[1] == "" {
		return aiConfig.GetOpenai()
	}

	switch schemas.ModelProvider(parts[0]) {
	case openAICompatibleProvider:
		return aiConfig.GetOpenaiCompatible()
	case schemas.OpenAI:
		_, cfg := resolveOpenAIProviderForModel(aiConfig, parts[1])
		return cfg
	default:
		return aiConfig.GetOpenai()
	}
}

func openAIRequestModel(req interface{}) string {
	switch r := req.(type) {
	case *openai.OpenAIChatRequest:
		return r.Model
	case *openai.OpenAIResponsesRequest:
		return r.Model
	case *openai.OpenAIEmbeddingRequest:
		return r.Model
	default:
		return ""
	}
}
