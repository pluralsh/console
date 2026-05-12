package router

import (
	"errors"
	"net/http"

	"github.com/maximhq/bifrost/core/providers/gemini"
	"github.com/maximhq/bifrost/core/schemas"
)

func (in *GeminiRouter) newCountTokensRoute(path string) RouteConfig {
	return RouteConfig{
		Path:                         path,
		Method:                       http.MethodPost,
		GetRequestTypeInstance:       in.responsesRequestTypeInstance,
		RequestConverter:             in.countTokensRequestConverter,
		CountTokensResponseConverter: in.countTokensResponseConverter,
		ErrorConverter:               in.geminiErrorConverter,
		PreCallback:                  in.geminiModelPreCallback(false),
	}
}

func (in *GeminiRouter) countTokensRequestConverter(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
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

	return &schemas.BifrostRequest{CountTokensRequest: bifrostReq}, nil
}

func (in *GeminiRouter) countTokensResponseConverter(_ *schemas.BifrostContext, resp *schemas.BifrostCountTokensResponse) (interface{}, error) {
	return gemini.ToGeminiCountTokensResponse(resp), nil
}
