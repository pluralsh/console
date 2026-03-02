package bifrost

import (
	"errors"
	"net/http"

	bifrostcore "github.com/maximhq/bifrost/core"
	"github.com/maximhq/bifrost/core/providers/openai"
	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/log"
	"go.uber.org/zap"
)

type VertexRouter struct {
	*GenericRouter
}

func NewVertexRouter(client *bifrostcore.Bifrost, resolver *EmbeddingResolver) Router {
	return (&VertexRouter{
		GenericRouter: &GenericRouter{client: client, resolver: resolver},
	}).init()
}

func (in *VertexRouter) init() Router {
	in.logger = log.Logger().With(zap.String("component", "bifrost-vertex-router"))
	in.routes = []RouteConfig{
		in.newEmbeddingsRoute(),
	}
	return in
}

func (in *VertexRouter) newEmbeddingsRoute() RouteConfig {
	return RouteConfig{
		Provider:               ProviderVertex,
		Path:                   "/v1/embeddings",
		Method:                 http.MethodPost,
		GetRequestTypeInstance: func() interface{} { return &openai.OpenAIEmbeddingRequest{} },
		RequestConverter: func(ctx *schemas.BifrostContext, req interface{}) (*schemas.BifrostRequest, error) {
			embeddingReq, ok := req.(*openai.OpenAIEmbeddingRequest)
			if !ok {
				return nil, errors.New("invalid request type")
			}

			bifrostReq := embeddingReq.ToBifrostEmbeddingRequest()
			if bifrostReq == nil {
				return nil, errors.New("invalid request type")
			}

			if err := in.resolver.Apply(schemas.Vertex, bifrostReq); err != nil {
				return nil, err
			}

			return &schemas.BifrostRequest{EmbeddingRequest: bifrostReq}, nil
		},
		EmbeddingResponseConverter: func(ctx *schemas.BifrostContext, resp *schemas.BifrostEmbeddingResponse) (interface{}, error) {
			return resp, nil
		},
		ErrorConverter: func(ctx *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
			return err
		},
	}
}
