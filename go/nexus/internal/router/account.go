package router

import (
	"context"
	"fmt"

	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/console"
	"github.com/pluralsh/console/go/nexus/internal/log"
	"go.uber.org/zap"
)

type NexusAccount interface {
	schemas.Account

	// EmbeddingsModelGetter provides the functionality
	// to retrieve embedding models by provider.
	EmbeddingsModelGetter
}

type EmbeddingsModelGetter interface {
	EmbeddingModelByProvider(provider schemas.ModelProvider) (string, error)
}

// Account implements the Bifrost account interface using Console configuration
type Account struct {
	consoleClient console.Client
	logger        *zap.Logger
	ctx           context.Context
}

// NewAccount creates a new account store that bridges Console and Bifrost
func NewAccount(ctx context.Context, consoleClient console.Client) NexusAccount {
	return &Account{
		consoleClient: consoleClient,
		logger:        log.Logger().With(zap.String("component", "account")),
		ctx:           ctx,
	}
}

func (in *Account) EmbeddingModelByProvider(provider schemas.ModelProvider) (string, error) {
	aiConfig, err := in.consoleClient.GetAiConfig(in.ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get AI config: %w", err)
	}

	if !aiConfig.GetEnabled() {
		return "", fmt.Errorf("AI is disabled in Console")
	}

	switch provider {
	case schemas.OpenAI:
		if cfg := aiConfig.GetOpenai(); cfg != nil && cfg.GetEmbeddingModel() != "" {
			return cfg.GetEmbeddingModel(), nil
		}
	case schemas.Vertex:
		if cfg := aiConfig.GetVertexAi(); cfg != nil && cfg.GetEmbeddingModel() != "" {
			return cfg.GetEmbeddingModel(), nil
		}
	case schemas.Bedrock:
		if cfg := aiConfig.GetBedrock(); cfg != nil && cfg.GetEmbeddingModelId() != "" {
			return cfg.GetEmbeddingModelId(), nil
		}
	}

	return "", nil
}

// GetConfiguredProviders returns the list of configured providers from Console
func (in *Account) GetConfiguredProviders() ([]schemas.ModelProvider, error) {
	aiConfig, err := in.consoleClient.GetAiConfig(in.ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI config: %w", err)
	}

	if !aiConfig.GetEnabled() {
		return nil, fmt.Errorf("AI is disabled in Console")
	}

	var providers []schemas.ModelProvider

	// Check each provider and add if configured
	if cfg := aiConfig.GetOpenai(); cfg != nil && cfg.ApiKey != nil {
		providers = append(providers, schemas.OpenAI)
	}

	if cfg := aiConfig.GetAnthropic(); cfg != nil && cfg.GetApiKey() != "" {
		providers = append(providers, schemas.Anthropic)
	}

	if cfg := aiConfig.GetVertexAi(); cfg != nil && cfg.GetProject() != "" && cfg.GetLocation() != "" {
		providers = append(providers, schemas.Vertex)
	}

	if cfg := aiConfig.GetBedrock(); cfg != nil && cfg.GetRegion() != "" {
		providers = append(providers, schemas.Bedrock)
	}

	if len(providers) == 0 {
		return nil, fmt.Errorf("no AI providers configured")
	}

	in.logger.Debug("configured providers retrieved", zap.Int("count", len(providers)))
	return providers, nil
}

// GetConfigForProvider returns the configuration for a specific provider
func (in *Account) GetConfigForProvider(provider schemas.ModelProvider) (*schemas.ProviderConfig, error) {
	aiConfig, err := in.consoleClient.GetAiConfig(in.ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI config: %w", err)
	}

	config := &schemas.ProviderConfig{
		NetworkConfig:            schemas.DefaultNetworkConfig,
		ConcurrencyAndBufferSize: schemas.DefaultConcurrencyAndBufferSize,
	}
	config.NetworkConfig.DefaultRequestTimeoutInSeconds = 300 // 5 minutes

	switch provider {
	case schemas.OpenAI:
		if cfg := aiConfig.GetOpenai(); cfg != nil && cfg.GetBaseUrl() != "" {
			config.NetworkConfig.BaseURL = cfg.GetBaseUrl()

		}

	case schemas.Anthropic:
		if cfg := aiConfig.GetAnthropic(); cfg != nil && cfg.GetBaseUrl() != "" {
			config.NetworkConfig.BaseURL = cfg.GetBaseUrl()
		}

	case schemas.Vertex:
		// Vertex uses project/location + auth in keys; no base URL override required.

	case schemas.Bedrock:
		// Bedrock uses AWS region + credentials in keys; no base URL override required.
	}

	return config, nil
}
