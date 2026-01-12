package console

import (
	"context"
	"os"

	pb "github.com/pluralsh/console/go/nexus/internal/proto"
)

// MockClient implements the Client interface for local development/testing without Console
type MockClient struct {
}

// NewMockClient creates a new mock console client
func NewMockClient() Client {
	return &MockClient{}
}

// GetAiConfig retrieves the AI configuration from environment variables
func (c *MockClient) GetAiConfig(_ context.Context) (*pb.AiConfig, error) {
	enabled := os.Getenv("NEXUS_AI_ENABLED") == "true"

	config := &pb.AiConfig{
		Enabled: enabled,
	}

	// OpenAI
	if key := os.Getenv("NEXUS_OPENAI_API_KEY"); key != "" {
		model := os.Getenv("NEXUS_OPENAI_MODEL")
		embeddingModel := os.Getenv("NEXUS_OPENAI_EMBEDDINGMODEL")
		toolModel := os.Getenv("NEXUS_OPENAI_TOOLMODEL")
		config.Openai = &pb.OpenAiConfig{
			ApiKey:         &key,
			Model:          &model,
			EmbeddingModel: &embeddingModel,
			ToolModel:      &toolModel,
		}
	}

	// Anthropic
	if key := os.Getenv("NEXUS_ANTHROPIC_API_KEY"); key != "" {
		model := os.Getenv("NEXUS_ANTHROPIC_MODEL")
		toolModel := os.Getenv("NEXUS_ANTHROPIC_TOOLMODEL")
		config.Anthropic = &pb.AnthropicConfig{
			ApiKey:    &key,
			Model:     &model,
			ToolModel: &toolModel,
		}
	}

	return config, nil
}

// ProxyAuthentication authenticates a request token - always returns true for mock
func (c *MockClient) ProxyAuthentication(_ context.Context, token string) (bool, error) {
	return true, nil
}

// IsConnected always returns true for mock
func (c *MockClient) IsConnected() bool {
	return true
}

// Close is a no-op for mock
func (c *MockClient) Close() error {
	return nil
}
