package router

import (
	"errors"
	"net/http"

	"github.com/maximhq/bifrost/core/providers/gemini"
	"github.com/maximhq/bifrost/core/schemas"
)

func (in *GeminiRouter) newGenerateContentRoute(path string) RouteConfig {
	return RouteConfig{
		Path:                       path,
		Method:                     http.MethodPost,
		GetRequestTypeInstance:     in.responsesRequestTypeInstance,
		RequestConverter:           in.responsesRequestConverter,
		ResponsesResponseConverter: in.responsesResponseConverter,
		ErrorConverter:             in.geminiErrorConverter,
		PreCallback:                in.geminiModelPreCallback(false),
	}
}

func (in *GeminiRouter) newStreamGenerateContentRoute(path string) RouteConfig {
	return RouteConfig{
		Path:                       path,
		Method:                     http.MethodPost,
		GetRequestTypeInstance:     in.responsesRequestTypeInstance,
		RequestConverter:           in.responsesRequestConverter,
		ResponsesResponseConverter: in.responsesResponseConverter,
		ErrorConverter:             in.geminiErrorConverter,
		PreCallback:                in.geminiModelPreCallback(true),
		SendDoneMarker:             new(false),
		StreamConfig: &StreamConfig{
			ResponsesStreamResponseConverter: in.responsesStreamResponseConverter,
			ErrorConverter:                   in.geminiErrorConverter,
		},
	}
}

func (in *GeminiRouter) responsesRequestTypeInstance() interface{} {
	return &gemini.GeminiGenerationRequest{}
}

func (in *GeminiRouter) responsesRequestConverter(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
	geminiReq, ok := req.(*gemini.GeminiGenerationRequest)
	if !ok {
		return nil, errors.New("invalid request type")
	}

	if geminiReq.Model == "" {
		if model, ok := ctx.Value(geminiPathModelContextKey).(string); ok {
			geminiReq.Model = model
		}
	}
	if geminiReq.Model == "" {
		return nil, errors.New("model is required")
	}

	bifrostReq := geminiReq.ToBifrostResponsesRequest(ctx)
	if bifrostReq == nil {
		return nil, errors.New("invalid request type")
	}

	return &schemas.BifrostRequest{ResponsesRequest: bifrostReq}, nil
}

func (in *GeminiRouter) responsesResponseConverter(_ *schemas.BifrostContext, resp *schemas.BifrostResponsesResponse) (interface{}, error) {
	return gemini.ToGeminiResponsesResponse(resp), nil
}

func (in *GeminiRouter) responsesStreamResponseConverter(ctx *schemas.BifrostContext, resp *schemas.BifrostResponsesStreamResponse) (string, interface{}, error) {
	streamState, _ := ctx.Value(geminiStreamStateContextKey).(*gemini.BifrostToGeminiStreamState)
	converted := gemini.ToGeminiResponsesStreamResponse(resp, streamState)
	if converted == nil {
		return "", nil, nil
	}

	return "", converted, nil
}
