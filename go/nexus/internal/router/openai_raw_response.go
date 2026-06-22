package router

import (
	"github.com/maximhq/bifrost/core/schemas"
)

// openaiChatRawResponse returns the upstream OpenAI JSON when it already matches the
// client-facing chat completions shape. Cross-format fallbacks copy responses-shaped raw
// payloads into chat responses, so passthrough must be skipped in that case.
func openaiChatRawResponse(ctx *schemas.BifrostContext, resp *schemas.BifrostChatResponse) (interface{}, bool) {
	if resp == nil || !isOpenAIBackedProvider(resp.ExtraFields.Provider) || resp.ExtraFields.RawResponse == nil {
		return nil, false
	}
	if chatViaResponses(ctx) {
		return nil, false
	}
	return resp.ExtraFields.RawResponse, true
}

func openaiResponsesRawResponse(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesResponse) (interface{}, bool) {
	if resp == nil || !isOpenAIBackedProvider(resp.ExtraFields.Provider) || resp.ExtraFields.RawResponse == nil {
		return nil, false
	}
	if responsesViaChat(ctx) {
		return nil, false
	}
	return resp.ExtraFields.RawResponse, true
}

func openaiResponsesStreamRawResponse(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesStreamResponse) (interface{}, bool) {
	if resp == nil || !isOpenAIBackedProvider(resp.ExtraFields.Provider) || resp.ExtraFields.RawResponse == nil {
		return nil, false
	}
	if responsesViaChat(ctx) {
		return nil, false
	}
	return resp.ExtraFields.RawResponse, true
}

func isOpenAIBackedProvider(provider schemas.ModelProvider) bool {
	return provider == schemas.OpenAI || provider == openAICompatibleProvider
}
