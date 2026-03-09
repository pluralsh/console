package router

import (
	"context"
	"fmt"
	"strings"

	"github.com/maximhq/bifrost/core/schemas"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
	"github.com/samber/lo"
	"go.uber.org/zap"
)

// GetKeysForProvider returns the API keys for a specific provider
func (in *Account) GetKeysForProvider(ctx context.Context, provider schemas.ModelProvider) ([]schemas.Key, error) {
	aiConfig, err := in.consoleClient.GetAiConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI config: %w", err)
	}

	if !aiConfig.GetEnabled() {
		return nil, fmt.Errorf("AI is disabled in Console")
	}

	switch provider {
	case schemas.OpenAI:
		return in.handleOpenAIKeys(aiConfig.GetOpenai())
	case schemas.Anthropic:
		return in.handleAnthropicKeys(aiConfig.GetAnthropic())
	case schemas.Vertex:
		return in.handleVertexKeys(aiConfig.GetVertexAi())
	case schemas.Bedrock:
		return in.handleBedrockKeys(aiConfig.GetBedrock())
	case schemas.Azure:
		return in.handleAzureKeys(aiConfig.GetAzure())
	default:
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
}

func (in *Account) handleOpenAIKeys(config *pb.OpenAiConfig) ([]schemas.Key, error) {
	if config == nil {
		return nil, fmt.Errorf("openai not configured")
	}

	in.logger.Debug("OpenAI configuration",
		zap.String("model", config.GetModel()),
		zap.String("tool_model", config.GetToolModel()),
		zap.String("embedding_model", config.GetEmbeddingModel()),
	)

	return []schemas.Key{
		{
			Value: schemas.EnvVar{
				Val: config.GetApiKey(),
			},
			Models: in.filterModels(append(
				[]string{config.GetModel(), config.GetToolModel(), config.GetEmbeddingModel()},
				config.GetProxyModels()...,
			)),
			UseForBatchAPI: lo.ToPtr(true),
			Weight:         1.0,
		},
	}, nil
}

func (in *Account) handleAnthropicKeys(config *pb.AnthropicConfig) ([]schemas.Key, error) {
	if config == nil {
		return nil, fmt.Errorf("anthropic not configured")
	}

	in.logger.Debug("Anthropic configuration",
		zap.String("model", config.GetModel()),
		zap.String("tool_model", config.GetToolModel()),
	)

	return []schemas.Key{
		{
			Value: schemas.EnvVar{
				Val: config.GetApiKey(),
			},
			Models: in.filterModels(append(
				[]string{config.GetModel(), config.GetToolModel()},
				config.GetProxyModels()...,
			)),
			UseForBatchAPI: lo.ToPtr(true),
			Weight:         1.0,
		},
	}, nil
}

func (in *Account) handleVertexKeys(config *pb.VertexAiConfig) ([]schemas.Key, error) {
	if config == nil {
		return nil, fmt.Errorf("vertex not configured")
	}

	in.logger.Debug("Vertex AI configuration",
		zap.String("model", config.GetModel()),
		zap.String("tool_model", config.GetToolModel()),
		zap.String("embedding_model", config.GetEmbeddingModel()),
	)

	return []schemas.Key{
		{
			Models: in.filterModels(append([]string{
				config.GetModel(),
				config.GetToolModel(),
				config.GetEmbeddingModel(),
			}, config.GetProxyModels()...)),
			VertexKeyConfig: &schemas.VertexKeyConfig{
				ProjectID: schemas.EnvVar{
					Val: config.GetProject(),
				},
				Region: schemas.EnvVar{
					Val: config.GetLocation(),
				},
				AuthCredentials: schemas.EnvVar{
					Val: config.GetServiceAccountJson(),
				},
			},
			UseForBatchAPI: lo.ToPtr(true),
			Weight:         1.0,
		},
	}, nil
}

func (in *Account) handleBedrockKeys(config *pb.BedrockConfig) ([]schemas.Key, error) {
	if config == nil {
		return nil, fmt.Errorf("bedrock not configured")
	}

	in.logger.Debug("Bedrock configuration",
		zap.String("model", config.GetModelId()),
		zap.String("tool_model", config.GetToolModelId()),
		zap.String("embedding_model", config.GetEmbeddingModelId()),
	)

	return []schemas.Key{
		{
			Models: in.filterModels(append([]string{
				config.GetModelId(),
				config.GetToolModelId(),
				config.GetEmbeddingModelId(),
			}, config.GetProxyModels()...)),
			BedrockKeyConfig: &schemas.BedrockKeyConfig{
				AccessKey: schemas.EnvVar{
					Val: config.GetAwsAccessKeyId(),
				},
				SecretKey: schemas.EnvVar{
					Val: config.GetAwsSecretAccessKey(),
				},
				Region: &schemas.EnvVar{
					Val: config.GetRegion(),
				},
				Deployments: in.filterDeployments(config.GetDeployments()),
			},
			UseForBatchAPI: lo.ToPtr(true),
			Weight:         1.0,
		},
	}, nil
}

func (in *Account) handleAzureKeys(config *pb.AzureOpenAiConfig) ([]schemas.Key, error) {
	if config == nil {
		return nil, fmt.Errorf("azure not configured")
	}

	in.logger.Debug("Azure configuration",
		zap.String("model", config.GetModel()),
		zap.String("tool_model", config.GetToolModel()),
		zap.String("embedding_model", config.GetEmbeddingModel()),
	)

	return []schemas.Key{
		{
			Models: in.filterModels(append([]string{
				config.GetModel(),
				config.GetToolModel(),
				config.GetEmbeddingModel(),
			}, config.GetProxyModels()...)),
			Value: schemas.EnvVar{
				Val: config.GetAccessToken(),
			},
			AzureKeyConfig: &schemas.AzureKeyConfig{
				Endpoint: schemas.EnvVar{
					// We need to remove the suffix since console deployment settings enforce it currently.
					Val: strings.TrimSuffix(config.GetEndpoint(), "/openai/deployments"),
				},
				Deployments: in.filterDeployments(config.GetDeployments()),
			},
			UseForBatchAPI: lo.ToPtr(true),
			Weight:         1.0,
		},
	}, nil
}

func (in *Account) filterModels(models []string) []string {
	return lo.Filter(models, func(model string, _ int) bool {
		return model != ""
	})
}

func (in *Account) filterDeployments(deployments map[string]string) map[string]string {
	result := make(map[string]string)

	for model, deployment := range deployments {
		if len(model) > 0 && len(deployment) > 0 {
			result[model] = deployment
		}
	}

	return result
}
