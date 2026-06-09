package router

import (
	"errors"
	"net/http"

	"github.com/maximhq/bifrost/core/providers/openai"
	"github.com/maximhq/bifrost/core/schemas"
)

func (in *OpenAIRouter) newResponsesRoute() RouteConfig {
	return RouteConfig{
		Path:                       string(RouteResponses),
		Method:                     http.MethodPost,
		GetRequestTypeInstance:     in.responsesRequestTypeInstance,
		RequestConverter:           in.responsesRequestConverter,
		ResponsesResponseConverter: in.responsesResponseConverter,
		ErrorConverter:             in.errorConverter,
		PreCallback:                in.openAIRoutePreCallback(string(RouteResponses)),
		StreamConfig: &StreamConfig{
			ResponsesStreamResponseConverter: in.responsesStreamResponseConverter,
			ErrorConverter:                   in.errorConverter,
		},
	}
}

func (in *OpenAIRouter) responsesRequestTypeInstance() interface{} {
	return &openai.OpenAIResponsesRequest{}
}

func (in *OpenAIRouter) responsesRequestConverter(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
	openaiReq, ok := req.(*openai.OpenAIResponsesRequest)
	if !ok {
		return nil, errors.New("invalid request type")
	}

	provider, model, _, err := in.resolveModel(ctx, openaiReq.Model)
	if err != nil {
		return nil, err
	}

	bifrostReq := openaiReq.ToBifrostResponsesRequest(ctx)
	if bifrostReq == nil {
		return nil, errors.New("invalid request type")
	}

	bifrostReq.Provider = provider
	bifrostReq.Model = model

	if responsesViaChat(ctx) {
		chatReq := bifrostReq.ToChatRequest()
		chatReq.Provider = provider
		chatReq.Model = model
		return &schemas.BifrostRequest{ChatRequest: chatReq}, nil
	}

	return &schemas.BifrostRequest{ResponsesRequest: bifrostReq}, nil
}

func (in *OpenAIRouter) responsesResponseConverter(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesResponse) (interface{}, error) {
	if raw, ok := openaiResponsesRawResponse(ctx, resp); ok {
		return raw, nil
	}

	return resp, nil
}

func (in *OpenAIRouter) responsesStreamResponseConverter(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesStreamResponse) (string, interface{}, error) {
	if raw, ok := openaiResponsesStreamRawResponse(ctx, resp); ok {
		return string(resp.Type), raw, nil
	}

	return string(resp.Type), resp, nil
}
