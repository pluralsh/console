package router

import (
	"errors"
	"net/http"

	"github.com/maximhq/bifrost/core/providers/openai"
	"github.com/maximhq/bifrost/core/schemas"
)

func (in *OpenAIRouter) newModelsRoute() RouteConfig {
	return RouteConfig{
		Path:                        string(RouteModels),
		Method:                      http.MethodGet,
		GetRequestTypeInstance:      in.modelsRequestTypeInstance,
		RequestConverter:            in.modelsRequestConverter,
		ListModelsResponseConverter: in.modelsResponseConverter,
		ErrorConverter:              in.errorConverter,
	}
}

func (in *OpenAIRouter) modelsRequestTypeInstance() interface{} {
	return &schemas.BifrostListModelsRequest{}
}

func (in *OpenAIRouter) modelsRequestConverter(_ *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
	if listModelsReq, ok := req.(*schemas.BifrostListModelsRequest); ok {
		return &schemas.BifrostRequest{
			ListModelsRequest: listModelsReq,
		}, nil
	}

	return nil, errors.New("invalid request type")
}

func (in *OpenAIRouter) modelsResponseConverter(_ *schemas.BifrostContext, resp *schemas.BifrostListModelsResponse) (interface{}, error) {
	return openai.ToOpenAIListModelsResponse(resp), nil
}
