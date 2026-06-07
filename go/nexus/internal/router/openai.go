package router

import (
	"context"
	"errors"
	"fmt"
	"strings"

	bifrostcore "github.com/maximhq/bifrost/core"
	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/console"
	"github.com/pluralsh/console/go/nexus/internal/log"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
	"go.uber.org/zap"
)

// Route represents the different routes supported by the OpenAIRouter.
type Route string

const (
	RouteEmbeddings      Route = "/v1/embeddings"
	RouteChatCompletions Route = "/v1/chat/completions"
	RouteResponses       Route = "/v1/responses"
	RouteModels          Route = "/v1/models"

	openAICompatibleProvider schemas.ModelProvider = "openai-compatible"
)

// OpenAIRouter is a generic router that expects a model to be in a format "provider/model" and
// request in OpenAI compatible format. It is responsible for converting requests/responses
// to the expected provider format on-the-fly. Supported providers are defined by the pb.AiConfig
// read from the Plural Console API.
type OpenAIRouter struct {
	*GenericRouter
	consoleClient console.Client
}

func (in *OpenAIRouter) resolveModel(ctx context.Context, model string) (schemas.ModelProvider, string, *pb.OpenAiConfig, error) {
	parts := strings.SplitN(strings.TrimSpace(model), "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", nil, errors.New("model must be in 'provider/model' format")
	}

	provider := schemas.ModelProvider(parts[0])
	switch provider {
	case schemas.OpenAI:
		aiConfig, err := in.consoleClient.GetAiConfig(ctx)
		if err != nil {
			return "", "", nil, fmt.Errorf("failed to load AI config: %w", err)
		}
		provider, cfg := resolveOpenAIProviderForModel(aiConfig, parts[1])
		return provider, parts[1], cfg, nil
	case openAICompatibleProvider:
		aiConfig, err := in.consoleClient.GetAiConfig(ctx)
		if err != nil {
			return "", "", nil, fmt.Errorf("failed to load AI config: %w", err)
		}
		if aiConfig.GetOpenaiCompatible() == nil {
			return "", "", nil, fmt.Errorf("provider not configured: %s", provider)
		}
		return provider, parts[1], aiConfig.GetOpenaiCompatible(), nil
	}

	if !schemas.IsKnownProvider(parts[0]) {
		return "", "", nil, fmt.Errorf("unknown provider: %s", parts[0])
	}

	return provider, parts[1], nil, nil
}

func resolveOpenAIProviderForModel(aiConfig *pb.AiConfig, model string) (schemas.ModelProvider, *pb.OpenAiConfig) {
	openAIConfig := aiConfig.GetOpenai()
	compatibleConfig := aiConfig.GetOpenaiCompatible()
	if compatibleConfig == nil {
		return schemas.OpenAI, openAIConfig
	}
	if openAIConfig == nil {
		return openAICompatibleProvider, compatibleConfig
	}
	if openAIConfigHasModel(compatibleConfig, model) && !openAIConfigHasModel(openAIConfig, model) {
		return openAICompatibleProvider, compatibleConfig
	}

	return schemas.OpenAI, openAIConfig
}

func openAIConfigHasModel(cfg *pb.OpenAiConfig, model string) bool {
	if cfg == nil || model == "" {
		return false
	}
	models := append([]string{cfg.GetModel(), cfg.GetToolModel(), cfg.GetEmbeddingModel()}, cfg.GetProxyModels()...)
	for _, configured := range models {
		if configured == model {
			return true
		}
	}
	return false
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

func NewOpenAIRouter(bifrostClient *bifrostcore.Bifrost, resolver *EmbeddingsResolver, consoleClient console.Client) Router {
	return (&OpenAIRouter{
		GenericRouter: &GenericRouter{
			client:   bifrostClient,
			resolver: resolver,
		},
		consoleClient: consoleClient,
	}).init()
}
