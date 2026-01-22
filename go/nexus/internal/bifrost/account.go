package bifrost

import (
	"context"
	"fmt"

	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/console"
	"github.com/samber/lo"
	"go.uber.org/zap"
)

// Account implements the Bifrost account interface using Console configuration
type Account struct {
	consoleClient console.Client
	logger        *zap.Logger
	ctx           context.Context
}

// NewAccount creates a new account store that bridges Console and Bifrost
func NewAccount(ctx context.Context, consoleClient console.Client, logger *zap.Logger) schemas.Account {
	return &Account{
		consoleClient: consoleClient,
		logger:        logger.With(zap.String("component", "account")),
		ctx:           ctx,
	}
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

	if len(providers) == 0 {
		return nil, fmt.Errorf("no AI providers configured")
	}

	in.logger.Debug("configured providers retrieved", zap.Int("count", len(providers)))
	return providers, nil
}

// GetKeysForProvider returns the API keys for a specific provider
func (in *Account) GetKeysForProvider(ctx context.Context, provider schemas.ModelProvider) ([]schemas.Key, error) {
	aiConfig, err := in.consoleClient.GetAiConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI config: %w", err)
	}

	switch provider {
	case schemas.OpenAI:
		cfg := aiConfig.GetOpenai()
		if cfg == nil || cfg.ApiKey == nil {
			return nil, fmt.Errorf("OpenAI not configured")
		}

		in.logger.Debug("OpenAI configuration", zap.String("model", cfg.GetModel()), zap.String("embedding_model", cfg.GetEmbeddingModel()), zap.String("tool_model", cfg.GetToolModel()))
		return []schemas.Key{
			{
				Value: schemas.EnvVar{
					Val: cfg.GetApiKey(),
				},
				Models:         []string{cfg.GetModel(), cfg.GetEmbeddingModel(), cfg.GetToolModel()},
				UseForBatchAPI: lo.ToPtr(true),
				Weight:         1.0,
			},
		}, nil

	case schemas.Anthropic:
		cfg := aiConfig.GetAnthropic()
		if cfg == nil || cfg.GetApiKey() == "" {
			return nil, fmt.Errorf("anthropic not configured")
		}

		in.logger.Debug("Anthropic configuration", zap.String("model", cfg.GetModel()), zap.String("tool_model", cfg.GetToolModel()))
		return []schemas.Key{
			{
				Value: schemas.EnvVar{
					Val: cfg.GetApiKey(),
				},
				Models:         []string{cfg.GetModel(), cfg.GetToolModel()},
				UseForBatchAPI: lo.ToPtr(true),
				Weight:         1.0,
			},
		}, nil

	default:
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
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
	}

	return config, nil
}
