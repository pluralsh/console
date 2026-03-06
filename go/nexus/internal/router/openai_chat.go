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
	if resp.ExtraFields.Provider == schemas.OpenAI {
		if resp.ExtraFields.RawResponse != nil {
			return "", resp.ExtraFields.RawResponse, nil
		}
	}

	return "", resp, nil
}
