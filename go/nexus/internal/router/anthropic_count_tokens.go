package router

import (
	"errors"
	"net/http"

	"github.com/maximhq/bifrost/core/providers/anthropic"
	"github.com/maximhq/bifrost/core/schemas"
)

func (in *AnthropicRouter) newCountTokensRoute() RouteConfig {
	return RouteConfig{
		Path:                         routeAnthropicCountTokens,
		Method:                       http.MethodPost,
		GetRequestTypeInstance:       in.countTokensRequestTypeInstance,
		RequestConverter:             in.countTokensRequestConverter,
		CountTokensResponseConverter: in.countTokensResponseConverter,
		ErrorConverter:               in.anthropicErrorConverter,
	}
}

func (in *AnthropicRouter) countTokensRequestTypeInstance() interface{} {
	return &anthropic.AnthropicMessageRequest{}
}

func (in *AnthropicRouter) countTokensRequestConverter(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
	anthropicReq, ok := req.(*anthropic.AnthropicMessageRequest)
	if !ok {
		return nil, errors.New("invalid request type")
	}

	bifrostReq := anthropicReq.ToBifrostResponsesRequest(ctx)
	if bifrostReq == nil {
		return nil, errors.New("invalid request type")
	}

	return &schemas.BifrostRequest{CountTokensRequest: bifrostReq}, nil
}

func (in *AnthropicRouter) countTokensResponseConverter(_ *schemas.BifrostContext, resp *schemas.BifrostCountTokensResponse) (interface{}, error) {
	return anthropic.ToAnthropicCountTokensResponse(resp), nil
}
