package bifrost

import (
	"errors"

	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/log"
	"go.uber.org/zap"
)

type EmbeddingConfig struct {
	DefaultProvider schemas.ModelProvider
	DefaultModel    string
	ProviderModels  map[schemas.ModelProvider]string
}

type EmbeddingResolver struct {
	embeddingsModelGetter EmbeddingsModelGetter
	logger                *zap.Logger
}

func NewEmbeddingResolver(embeddingsModelGetter EmbeddingsModelGetter) *EmbeddingResolver {
	return &EmbeddingResolver{
		embeddingsModelGetter: embeddingsModelGetter,
		logger:                log.Logger().With(zap.String("component", "embedding-resolver")),
	}
}

func (in *EmbeddingResolver) Apply(provider schemas.ModelProvider, req *schemas.BifrostEmbeddingRequest) error {
	if in.supportsEmbeddings(req.Provider) {
		if len(req.Model) == 0 {
			return errors.New("embedding model is required")
		}

		return nil
	}

	config, err := in.toEmbeddingConfig()
	if err != nil {
		return err
	}

	if len(req.Provider) == 0 {
		req.Provider = provider
	}

	return in.applyDefaults(config, req)
}

func (in *EmbeddingResolver) applyDefaults(config *EmbeddingConfig, req *schemas.BifrostEmbeddingRequest) error {
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

	return nil
}

func (in *EmbeddingResolver) toEmbeddingConfig() (*EmbeddingConfig, error) {
	providers := []schemas.ModelProvider{schemas.OpenAI, schemas.Vertex, schemas.Bedrock}
	providerModels := map[schemas.ModelProvider]string{}

	for _, provider := range providers {
		if model, err := in.embeddingsModelGetter.EmbeddingModelByProvider(provider); err == nil && len(model) > 0 {
			providerModels[provider] = model
		}
	}

	defaultProvider, defaultModel := in.pickDefaultEmbeddingProvider(providerModels)
	if defaultProvider == "" || defaultModel == "" {
		return nil, errors.New("no embedding providers configured")
	}

	return &EmbeddingConfig{
		DefaultProvider: defaultProvider,
		DefaultModel:    defaultModel,
		ProviderModels:  providerModels,
	}, nil
}

func (in *EmbeddingResolver) pickDefaultEmbeddingProvider(providerModels map[schemas.ModelProvider]string) (schemas.ModelProvider, string) {
	priority := []schemas.ModelProvider{schemas.OpenAI, schemas.Vertex, schemas.Bedrock}
	for _, provider := range priority {
		if model, ok := providerModels[provider]; ok && model != "" {
			return provider, model
		}
	}
	return "", ""
}

func (in *EmbeddingResolver) supportsEmbeddings(provider schemas.ModelProvider) bool {
	switch provider {
	case schemas.OpenAI, schemas.Vertex, schemas.Bedrock, schemas.Gemini:
		return true
	default:
		return false
	}
}
