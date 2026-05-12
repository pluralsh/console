package router

import (
	"errors"
	"fmt"
	"strings"

	bifrostcore "github.com/maximhq/bifrost/core"
	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/log"
	"go.uber.org/zap"
)

// Route represents the different routes supported by the OpenAIRouter.
type Route string

const (
	RouteEmbeddings      Route = "/v1/embeddings"
	RouteChatCompletions Route = "/v1/chat/completions"
	RouteResponses       Route = "/v1/responses"
	RouteModels          Route = "/v1/models"
)

// OpenAIRouter is a generic router that expects a model to be in a format "provider/model" and
// request in OpenAI compatible format. It is responsible for converting requests/responses
// to the expected provider format on-the-fly. Supported providers are defined by the pb.AiConfig
// read from the Plural Console API.
type OpenAIRouter struct {
	*GenericRouter
}

func (in *OpenAIRouter) validateModelFormat(model string) (schemas.ModelProvider, string, error) {
	parts := strings.SplitN(strings.TrimSpace(model), "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", errors.New("model must be in 'provider/model' format")
	}

	if !schemas.IsKnownProvider(parts[0]) {
		return "", "", fmt.Errorf("unknown provider: %s", parts[0])
	}

	return schemas.ModelProvider(parts[0]), parts[1], nil
}

func (in *OpenAIRouter) errorConverter(_ *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
	return err
}

func (in *OpenAIRouter) init() Router {
	in.logger = log.Logger().With(zap.String("component", "bifrost-generic-openai-router"))
	in.routes = []RouteConfig{
		in.newChatCompletionsRoute(),
		in.newResponsesRoute(),
		in.newEmbeddingsRoute(),
		in.newModelsRoute(),
	}

	return in
}

func NewOpenAIRouter(client *bifrostcore.Bifrost, resolver *EmbeddingsResolver) Router {
	return (&OpenAIRouter{
		GenericRouter: &GenericRouter{
			client:   client,
			resolver: resolver,
		},
	}).init()
}
