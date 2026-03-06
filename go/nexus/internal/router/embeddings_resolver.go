package router

import (
	"errors"
	"slices"

	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/log"
	"go.uber.org/zap"
)

var (
	embeddingsProviderPriorityList = []schemas.ModelProvider{schemas.OpenAI, schemas.Vertex, schemas.Bedrock, schemas.Azure}
)

type EmbeddingsConfig struct {
	DefaultProvider schemas.ModelProvider
	DefaultModel    string
}

type EmbeddingsResolver struct {
	embeddingsModelGetter EmbeddingsModelGetter
	logger                *zap.Logger
}

func NewEmbeddingsResolver(embeddingsModelGetter EmbeddingsModelGetter) *EmbeddingsResolver {
	return &EmbeddingsResolver{
		embeddingsModelGetter: embeddingsModelGetter,
		logger:                log.Logger().With(zap.String("component", "embedding-resolver")),
	}
}

func (in *EmbeddingsResolver) Apply(req *schemas.BifrostEmbeddingRequest) error {
	if in.supportsEmbeddings(req.Provider) {
		if len(req.Model) == 0 {
			return errors.New("embedding model is required")
		}

		in.logger.Debug("provider supports embeddings, using provided model",
			zap.String("provider", string(req.Provider)),
			zap.String("model", req.Model),
		)

		return nil
	}

	in.logger.Debug("provider does not support embeddings, looking for default embedding provider and model",
		zap.String("provider", string(req.Provider)),
	)

	config, err := in.toEmbeddingConfig()
	if err != nil {
		return err
	}

	return in.applyDefaults(config, req)
}

func (in *EmbeddingsResolver) applyDefaults(config *EmbeddingsConfig, req *schemas.BifrostEmbeddingRequest) error {
	if config == nil {
		return errors.New("embedding config is required")
	}

	if len(config.DefaultProvider) == 0 || len(config.DefaultModel) == 0 {
		return errors.New("default embedding provider and model are required")
	}

	if req == nil {
		return errors.New("embedding request is required")
	}

	if len(req.Fallbacks) > 0 {
		in.logger.Debug("embedding request already has fallbacks", zap.Any("fallbacks", req.Fallbacks))
		return nil
	}

	req.Fallbacks = []schemas.Fallback{{
		Provider: config.DefaultProvider,
		Model:    config.DefaultModel,
	}}

	in.logger.Debug("adding default fallback", zap.Any("fallback", req.Fallbacks[0]))
	return nil
}

func (in *EmbeddingsResolver) toEmbeddingConfig() (*EmbeddingsConfig, error) {
	providerModels := map[schemas.ModelProvider]string{}

	for _, provider := range embeddingsProviderPriorityList {
		if model, err := in.embeddingsModelGetter.EmbeddingModelByProvider(provider); err == nil && len(model) > 0 {
			providerModels[provider] = model
		}
	}

	defaultProvider, defaultModel := in.pickDefaultEmbeddingProvider(providerModels)
	if defaultProvider == "" || defaultModel == "" {
		return nil, errors.New("no embedding providers configured")
	}

	return &EmbeddingsConfig{
		DefaultProvider: defaultProvider,
		DefaultModel:    defaultModel,
	}, nil
}

func (in *EmbeddingsResolver) pickDefaultEmbeddingProvider(providerModels map[schemas.ModelProvider]string) (schemas.ModelProvider, string) {
	for _, provider := range embeddingsProviderPriorityList {
		if model, ok := providerModels[provider]; ok && model != "" {
			return provider, model
		}
	}

	return "", ""
}

func (in *EmbeddingsResolver) supportsEmbeddings(provider schemas.ModelProvider) bool {
	return slices.Contains(embeddingsProviderPriorityList, provider)
}
