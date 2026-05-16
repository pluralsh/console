package router

import (
	"fmt"
	"net/http"

	"github.com/maximhq/bifrost/core/schemas"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
)

const (
	// nexusRouteChatViaResponsesKey marks /v1/chat/completions requests that should be
	// executed through the Bifrost responses API and converted back to chat completions.
	nexusRouteChatViaResponsesKey schemas.BifrostContextKey = "nexus-openai-route-chat-via-responses"

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
			ctx.SetValue(nexusRouteChatViaResponsesKey, true)
		}
	}
}

func responsesViaChat(ctx *schemas.BifrostContext) bool {
	v, ok := ctx.Value(schemas.BifrostContextKeyIsResponsesToChatCompletionFallback).(bool)
	return ok && v
}

func chatViaResponses(ctx *schemas.BifrostContext) bool {
	v, ok := ctx.Value(nexusRouteChatViaResponsesKey).(bool)
	return ok && v
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
	return func(request *http.Request, bifrostCtx *schemas.BifrostContext, _ interface{}) error {
		aiConfig, err := in.consoleClient.GetAiConfig(request.Context())
		if err != nil {
			return fmt.Errorf("failed to load AI config: %w", err)
		}

		applyOpenAIRoutingContext(bifrostCtx, path, openAIHTTPPolicyFromConfig(aiConfig.GetOpenai()))
		return nil
	}
}
