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
			Models: in.toBedrockModels(config),
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
				Deployments: in.toBedrockDeployments(config),
			},
			UseForBatchAPI: lo.ToPtr(true),
			Weight:         1.0,
		},
	}, nil
}

// toBedrockModels returns an array of model IDs. We are assuming that
// configured models can be inference profile IDs that contain regional prefix in
// model ID, i.e.,
//
// Inference Profile ID: global.anthropic.claude-haiku-4-5-20251001-v1:0
// Model ID: anthropic.claude-haiku-4-5-20251001-v1:0
func (in *Account) toBedrockModels(config *pb.BedrockConfig) []string {
	result := make([]string, 0)
	models := append(config.GetProxyModels(), config.GetModelId(), config.GetToolModelId(), config.GetEmbeddingModelId())
	for _, modelID := range models {
		if len(modelID) == 0 {
			continue
		}

		_, model := in.parseModelID(modelID)
		result = append(result, model)
	}

	return result
}

// toBedrockDeployments returns a map of model IDs to inference profile IDs.
// Similar to toBedrockModels, we are assuming that configured models can be
// inference profile IDs that contain regional prefix in model ID, i.e.,
//
// Inference Profile ID: global.anthropic.claude-haiku-4-5-20251001-v1:0
// Model ID: anthropic.claude-haiku-4-5-20251001-v1:0
func (in *Account) toBedrockDeployments(config *pb.BedrockConfig) map[string]string {
	deployments := in.filterDeployments(config.GetDeployments())
	if deployments == nil {
		deployments = make(map[string]string)
	}

	models := append(config.GetProxyModels(), config.GetModelId(), config.GetToolModelId(), config.GetEmbeddingModelId())

	// Augment configured deployments with provided profiles ids.
	for _, modelID := range models {
		if len(modelID) == 0 {
			continue
		}

		inferenceProfileID, model := in.parseModelID(modelID)
		deployments[model] = inferenceProfileID
	}

	return deployments
}

func (in *Account) parseModelID(modelID string) (inferenceProfileID string, model string) {
	if len(modelID) == 0 {
		return "", ""
	}

	parts := strings.Split(modelID, ".")

	// inference profiles should always have 3 parts <region>.<provider>.<model>
	// if it doesn't just use as-is
	if len(parts) != 3 {
		return modelID, modelID
	}

	return modelID, strings.Join(parts[1:], ".")
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
