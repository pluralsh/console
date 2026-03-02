package bifrost

import (
	"context"
	"fmt"

	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/console"
	"github.com/samber/lo"
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
func NewAccount(ctx context.Context, consoleClient console.Client, logger *zap.Logger) NexusAccount {
	return &Account{
		consoleClient: consoleClient,
		logger:        logger.With(zap.String("component", "account")),
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

		in.logger.Debug("OpenAI configuration",
			zap.String("model", cfg.GetModel()),
			zap.String("embedding_model", cfg.GetEmbeddingModel()),
			zap.String("tool_model", cfg.GetToolModel()),
		)

		return []schemas.Key{
			{
				Value: schemas.EnvVar{
					Val: cfg.GetApiKey(),
				},
				Models:         filterModels(append([]string{cfg.GetModel(), cfg.GetEmbeddingModel(), cfg.GetToolModel()}, cfg.GetProxyModels()...)),
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
				Models:         filterModels(append([]string{cfg.GetModel(), cfg.GetToolModel()}, cfg.GetProxyModels()...)),
				UseForBatchAPI: lo.ToPtr(true),
				Weight:         1.0,
			},
		}, nil

	case schemas.Vertex:
		cfg := aiConfig.GetVertexAi()
		if cfg == nil || cfg.GetProject() == "" || cfg.GetLocation() == "" {
			return nil, fmt.Errorf("vertex ai not configured")
		}

		in.logger.Debug("Vertex AI configuration",
			zap.String("model", cfg.GetModel()),
			zap.String("embedding_model", cfg.GetEmbeddingModel()),
			zap.String("tool_model", cfg.GetToolModel()),
		)

		return []schemas.Key{
			{
				Value: schemas.EnvVar{
					Val: cfg.GetApiKey(),
				},
				Models: filterModels(append([]string{
					cfg.GetModel(),
					cfg.GetEmbeddingModel(),
					cfg.GetToolModel(),
				}, cfg.GetProxyModels()...)),
				VertexKeyConfig: &schemas.VertexKeyConfig{
					ProjectID: schemas.EnvVar{
						Val: cfg.GetProject(),
					},
					Region: schemas.EnvVar{
						Val: cfg.GetLocation(),
					},
					AuthCredentials: schemas.EnvVar{
						Val: cfg.GetServiceAccountJson(),
					},
				},
				UseForBatchAPI: lo.ToPtr(true),
				Weight:         1.0,
			},
		}, nil

	case schemas.Bedrock:
		cfg := aiConfig.GetBedrock()
		if cfg == nil || cfg.GetRegion() == "" {
			return nil, fmt.Errorf("bedrock not configured")
		}

		in.logger.Debug("Bedrock configuration",
			zap.String("model", cfg.GetModelId()),
			zap.String("embedding_model", cfg.GetEmbeddingModelId()),
			zap.String("tool_model", cfg.GetToolModelId()),
		)

		key := schemas.Key{
			Models: filterModels(append([]string{
				cfg.GetModelId(),
				cfg.GetEmbeddingModelId(),
				cfg.GetToolModelId(),
			}, cfg.GetProxyModels()...)),
			BedrockKeyConfig: &schemas.BedrockKeyConfig{
				AccessKey: schemas.EnvVar{
					Val: cfg.GetAwsAccessKeyId(),
				},
				SecretKey: schemas.EnvVar{
					Val: cfg.GetAwsSecretAccessKey(),
				},
				Region: lo.ToPtr(schemas.EnvVar{
					Val: cfg.GetRegion(),
				}),
			},
			UseForBatchAPI: lo.ToPtr(true),
			Weight:         1.0,
		}

		if cfg.GetAccessToken() != "" {
			key.Value = schemas.EnvVar{Val: cfg.GetAccessToken()}
		}

		return []schemas.Key{key}, nil

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

	case schemas.Vertex:
		// Vertex uses project/location + auth in keys; no base URL override required.

	case schemas.Bedrock:
		// Bedrock uses AWS region + credentials in keys; no base URL override required.
	}

	return config, nil
}

func filterModels(models []string) []string {
	return lo.Filter(models, func(model string, _ int) bool {
		return model != ""
	})
}
