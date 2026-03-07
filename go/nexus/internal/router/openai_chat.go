package router

import (
	"errors"
	"net/http"

	"github.com/maximhq/bifrost/core/providers/openai"
	"github.com/maximhq/bifrost/core/schemas"
)

func (in *OpenAIRouter) newChatCompletionsRoute() RouteConfig {
	return RouteConfig{
		Path:                   string(RouteChatCompletions),
		Method:                 http.MethodPost,
		GetRequestTypeInstance: in.chatCompletionsRequestTypeInstance,
		RequestConverter:       in.chatCompletionsRequestConverter,
		ChatResponseConverter:  in.chatCompletionsResponseConverter,
		ErrorConverter:         in.errorConverter,
		StreamConfig: &StreamConfig{
			ChatStreamResponseConverter: in.chatCompletionsStreamConverter,
			ErrorConverter:              in.errorConverter,
		},
	}
}

func (in *OpenAIRouter) chatCompletionsRequestTypeInstance() interface{} {
	return &openai.OpenAIChatRequest{}
}

func (in *OpenAIRouter) chatCompletionsRequestConverter(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
	openaiReq, ok := req.(*openai.OpenAIChatRequest)
	if !ok {
		return nil, errors.New("invalid request type")
	}

	provider, model, err := in.validateModelFormat(openaiReq.Model)
	if err != nil {
		return nil, err
	}

	bifrostReq := openaiReq.ToBifrostChatRequest(ctx)
	if bifrostReq == nil {
		return nil, errors.New("invalid request type")
	}

	bifrostReq.Provider = provider
	bifrostReq.Model = model

	return &schemas.BifrostRequest{ChatRequest: bifrostReq}, nil
}

func (in *OpenAIRouter) chatCompletionsResponseConverter(_ *schemas.BifrostContext, resp *schemas.BifrostChatResponse) (interface{}, error) {
	if resp.ExtraFields.Provider == schemas.OpenAI {
		if resp.ExtraFields.RawResponse != nil {
			return resp.ExtraFields.RawResponse, nil
		}
	}

	return resp, nil
}

func (in *OpenAIRouter) chatCompletionsStreamConverter(_ *schemas.BifrostContext, resp *schemas.BifrostChatResponse) (string, interface{}, error) {
	in.chatCompletionsFixEarlyVertexStreamCompletion(resp)

	if resp.ExtraFields.Provider == schemas.OpenAI {
		if resp.ExtraFields.RawResponse != nil {
			return "", resp.ExtraFields.RawResponse, nil
		}
	}

	return "", resp, nil
}

// chatCompletionsFixEarlyVertexStreamCompletion normalizes a Vertex/Gemini stream edge case
// where a chunk may include tool calls but still carry finish_reason="stop".
//
// Why this exists:
//   - Some Vertex Gemini streaming chunks surface tool calls and encrypted reasoning metadata
//     together with finish_reason="stop" in the same chunk.
//   - OpenAI-compatible clients (including opencode) generally interpret "stop" as final text
//     completion and may terminate the agent/tool loop early instead of executing tool calls.
//   - In this scenario, "tool_calls" is the semantically correct stop reason because the model
//     is requesting tool execution, not finishing the assistant turn.
//
// What we do:
// - Only for Vertex provider responses.
// - Only for streaming choices that have:
//  1. finish_reason == "stop"
//  2. delta.tool_calls present
//
// - Rewrite finish_reason to "tool_calls".
//
// This is a compatibility shim at the Nexus edge to keep downstream OpenAI clients behaving
// correctly until upstream provider normalization is consistent.
func (in *OpenAIRouter) chatCompletionsFixEarlyVertexStreamCompletion(resp *schemas.BifrostChatResponse) {
	if resp == nil || resp.ExtraFields.Provider != schemas.Vertex {
		return
	}

	for i := range resp.Choices {
		choice := &resp.Choices[i]
		if choice.FinishReason == nil || *choice.FinishReason != string(schemas.BifrostFinishReasonStop) {
			continue
		}

		if choice.ChatStreamResponseChoice == nil || choice.Delta == nil {
			continue
		}

		if len(choice.Delta.ToolCalls) == 0 {
			continue
		}

		finishReason := string(schemas.BifrostFinishReasonToolCalls)
		choice.FinishReason = &finishReason
	}
}
