package router

import (
	"errors"
	"net/http"

	"github.com/maximhq/bifrost/core/providers/openai"
	"github.com/maximhq/bifrost/core/schemas"
)

func (in *OpenAIRouter) newEmbeddingsRoute() RouteConfig {
	return RouteConfig{
		Path:                       string(RouteEmbeddings),
		Method:                     http.MethodPost,
		GetRequestTypeInstance:     in.embeddingsRequestTypeInstance,
		RequestConverter:           in.embeddingsRequestConverter,
		EmbeddingResponseConverter: in.embeddingsResponseConverter,
		ErrorConverter:             in.errorConverter,
	}
}

func (in *OpenAIRouter) embeddingsRequestTypeInstance() interface{} {
	return &openai.OpenAIEmbeddingRequest{}
}

func (in *OpenAIRouter) embeddingsRequestConverter(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
	embeddingReq, ok := req.(*openai.OpenAIEmbeddingRequest)
	if !ok {
		return nil, errors.New("invalid request type")
	}

	provider, model, err := in.validateModelFormat(embeddingReq.Model)
	if err != nil {
		return nil, err
	}

	bifrostReq := embeddingReq.ToBifrostEmbeddingRequest(ctx)
	if bifrostReq == nil {
		return nil, errors.New("invalid request type")
	}

	bifrostReq.Provider = provider
	bifrostReq.Model = model

	if err := in.resolver.Apply(provider, bifrostReq); err != nil {
		return nil, err
	}

	return &schemas.BifrostRequest{EmbeddingRequest: bifrostReq}, nil
}

func (in *OpenAIRouter) embeddingsResponseConverter(_ *schemas.BifrostContext, resp *schemas.BifrostEmbeddingResponse) (interface{}, error) {
	if resp.ExtraFields.Provider == schemas.OpenAI {
		if resp.ExtraFields.RawResponse != nil {
			return resp.ExtraFields.RawResponse, nil
		}
	}

	return resp, nil
}
