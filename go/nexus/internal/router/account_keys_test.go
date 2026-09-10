package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/maximhq/bifrost/core/schemas"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
	"github.com/pluralsh/console/go/nexus/internal/tokenexchange"
	"github.com/samber/lo"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

type mockConsoleClient struct {
	cfg *pb.AiConfig
}

func (m *mockConsoleClient) GetAiConfig(_ context.Context) (*pb.AiConfig, error) {
	return m.cfg, nil
}

func (m *mockConsoleClient) ProxyAuthentication(_ context.Context, _ string) (bool, error) {
	return true, nil
}

func (m *mockConsoleClient) IsConnected() bool { return true }

func (m *mockConsoleClient) Close() error { return nil }

func TestHandleOpenAIKeys_noAPIKey(t *testing.T) {
	cfg := &pb.AiConfig{
		Enabled: true,
		Openai: &pb.OpenAiConfig{
			Model: lo.ToPtr("gpt-4"),
		},
	}
	acct := &Account{
		consoleClient: &mockConsoleClient{cfg: cfg},
		tokenCache:    tokenexchange.NewCache(),
		logger:        zap.NewNop(),
	}

	keys, err := acct.GetKeysForProvider(context.Background(), schemas.OpenAI)
	require.NoError(t, err)
	require.Len(t, keys, 1)
	require.Empty(t, keys[0].Value.Val)
}

func TestHandleOpenAIKeys_tokenExchangeUsesCache(t *testing.T) {
	var tokenCalls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenCalls.Add(1)
		_ = r.ParseForm()
		if r.FormValue("grant_type") != "client_credentials" {
			http.Error(w, "bad grant", http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"access_token":"oauth-at","expires_in":3600}`))
	}))
	t.Cleanup(srv.Close)

	tokenURL := srv.URL + "/oauth/token"
	cfg := &pb.AiConfig{
		Enabled: true,
		Openai: &pb.OpenAiConfig{
			Model: lo.ToPtr("gpt-4"),
			TokenExchange: &pb.OpenAiTokenExchange{
				Enabled:      lo.ToPtr(true),
				TokenUrl:     lo.ToPtr(tokenURL),
				ClientId:     lo.ToPtr("id"),
				ClientSecret: lo.ToPtr("secret"),
			},
		},
	}

	acct := &Account{
		consoleClient: &mockConsoleClient{cfg: cfg},
		tokenCache:    tokenexchange.NewCacheWithHTTPClient(srv.Client()),
		logger:        zap.NewNop(),
	}
	ctx := context.Background()

	keys1, err := acct.GetKeysForProvider(ctx, schemas.OpenAI)
	require.NoError(t, err)
	require.Len(t, keys1, 1)
	require.Equal(t, "oauth-at", keys1[0].Value.Val)
	c1 := tokenCalls.Load()
	require.GreaterOrEqual(t, c1, int32(1))

	keys2, err := acct.GetKeysForProvider(ctx, schemas.OpenAI)
	require.NoError(t, err)
	require.Equal(t, "oauth-at", keys2[0].Value.Val)
	require.Equal(t, c1, tokenCalls.Load(), "second GetKeysForProvider should use cached OAuth token")
}

func TestHandleOpenAIKeys_tokenExchangeEnabledIncomplete(t *testing.T) {
	cfg := &pb.AiConfig{
		Enabled: true,
		Openai: &pb.OpenAiConfig{
			Model: lo.ToPtr("gpt-4"),
			TokenExchange: &pb.OpenAiTokenExchange{
				Enabled:  lo.ToPtr(true),
				ClientId: lo.ToPtr("only-id"),
			},
		},
	}
	acct := &Account{
		consoleClient: &mockConsoleClient{cfg: cfg},
		tokenCache:    tokenexchange.NewCache(),
		logger:        zap.NewNop(),
	}
	_, err := acct.GetKeysForProvider(context.Background(), schemas.OpenAI)
	require.Error(t, err)
}

func TestAccountBedrockRuntimeEndpointIsDefault(t *testing.T) {
	cfg := &pb.AiConfig{
		Enabled: true,
		Bedrock: &pb.BedrockConfig{
			ModelId: lo.ToPtr("anthropic.claude-sonnet-4-6"),
			Region:  lo.ToPtr("us-east-1"),
		},
	}
	acct := &Account{
		consoleClient: &mockConsoleClient{cfg: cfg},
		tokenCache:    tokenexchange.NewCache(),
		logger:        zap.NewNop(),
	}

	providers, err := acct.GetConfiguredProviders()
	require.NoError(t, err)
	require.Contains(t, providers, schemas.Bedrock)
	require.NotContains(t, providers, schemas.BedrockMantle)

	provider, model, _, err := (&OpenAIRouter{consoleClient: acct.consoleClient}).resolveModel(
		context.Background(),
		"bedrock/anthropic.claude-sonnet-4-6",
	)
	require.NoError(t, err)
	require.Equal(t, schemas.Bedrock, provider)
	require.Equal(t, "anthropic.claude-sonnet-4-6", model)

	keys, err := acct.GetKeysForProvider(context.Background(), schemas.Bedrock)
	require.NoError(t, err)
	require.Len(t, keys, 1)
	require.NotNil(t, keys[0].BedrockKeyConfig)
	require.Nil(t, keys[0].BedrockMantleKeyConfig)
	require.Empty(t, keys[0].BedrockKeyConfig.AccessKey.GetValue())
	require.Empty(t, keys[0].BedrockKeyConfig.SecretKey.GetValue())
}

func TestAccountBedrockMantleEndpointUsesMantleAndRuntimeEmbeddings(t *testing.T) {
	endpoint := pb.BedrockEndpoint_MANTLE
	cfg := &pb.AiConfig{
		Enabled: true,
		Bedrock: &pb.BedrockConfig{
			ModelId:          lo.ToPtr("anthropic.claude-sonnet-4-6"),
			ToolModelId:      lo.ToPtr("openai.gpt-5.4"),
			EmbeddingModelId: lo.ToPtr("cohere.embed-english-v3"),
			ProxyModels:      []string{"google.gemma-4-27b"},
			AccessToken:      lo.ToPtr("bedrock-token"),
			Region:           lo.ToPtr("us-west-2"),
			Endpoint:         &endpoint,
		},
	}
	acct := &Account{
		consoleClient: &mockConsoleClient{cfg: cfg},
		tokenCache:    tokenexchange.NewCache(),
		logger:        zap.NewNop(),
	}

	providers, err := acct.GetConfiguredProviders()
	require.NoError(t, err)
	require.ElementsMatch(t, []schemas.ModelProvider{schemas.BedrockMantle, schemas.Bedrock}, providers)

	provider, model, _, err := (&OpenAIRouter{consoleClient: acct.consoleClient}).resolveModel(
		context.Background(),
		"bedrock/anthropic.claude-sonnet-4-6",
	)
	require.NoError(t, err)
	require.Equal(t, schemas.BedrockMantle, provider)
	require.Equal(t, "anthropic.claude-sonnet-4-6", model)

	mantleKeys, err := acct.GetKeysForProvider(context.Background(), schemas.BedrockMantle)
	require.NoError(t, err)
	require.Len(t, mantleKeys, 1)
	require.Nil(t, mantleKeys[0].BedrockKeyConfig)
	require.NotNil(t, mantleKeys[0].BedrockMantleKeyConfig)
	require.Equal(t, "bedrock-token", mantleKeys[0].Value.GetValue())
	require.ElementsMatch(t,
		[]string{"anthropic.claude-sonnet-4-6", "openai.gpt-5.4", "google.gemma-4-27b"},
		mantleKeys[0].Models,
	)

	runtimeKeys, err := acct.GetKeysForProvider(context.Background(), schemas.Bedrock)
	require.NoError(t, err)
	require.Len(t, runtimeKeys, 1)
	require.NotNil(t, runtimeKeys[0].BedrockKeyConfig)
	require.Equal(t, []string{"cohere.embed-english-v3"}, []string(runtimeKeys[0].Models))
}

func TestAccountOpenAICompatibleProvider(t *testing.T) {
	chat := pb.OpenAiMethod_CHAT
	cfg := &pb.AiConfig{
		Enabled: true,
		Openai: &pb.OpenAiConfig{
			Model:  lo.ToPtr("gpt-4o"),
			ApiKey: lo.ToPtr("openai-key"),
		},
		OpenaiCompatible: &pb.OpenAiConfig{
			Model:       lo.ToPtr("llama"),
			ToolModel:   lo.ToPtr("llama-tools"),
			BaseUrl:     lo.ToPtr("https://litellm.example/v1"),
			ApiKey:      lo.ToPtr("compat-key"),
			ProxyModels: []string{"deepseek"},
			Method:      &chat,
		},
	}
	acct := &Account{
		consoleClient: &mockConsoleClient{cfg: cfg},
		tokenCache:    tokenexchange.NewCache(),
		logger:        zap.NewNop(),
	}

	providers, err := acct.GetConfiguredProviders()
	require.NoError(t, err)
	require.Contains(t, providers, schemas.OpenAI)
	require.Contains(t, providers, openAICompatibleProvider)

	keys, err := acct.GetKeysForProvider(context.Background(), openAICompatibleProvider)
	require.NoError(t, err)
	require.Len(t, keys, 1)
	require.Equal(t, "compat-key", keys[0].Value.Val)
	require.ElementsMatch(t, []string{"llama", "llama-tools", "deepseek"}, keys[0].Models)

	providerConfig, err := acct.GetConfigForProvider(openAICompatibleProvider)
	require.NoError(t, err)
	require.Equal(t, "https://litellm.example", providerConfig.NetworkConfig.BaseURL)
	require.NotNil(t, providerConfig.CustomProviderConfig)
	require.Equal(t, schemas.OpenAI, providerConfig.CustomProviderConfig.BaseProviderType)
	require.True(t, providerConfig.CustomProviderConfig.AllowedRequests.ChatCompletion)
	require.False(t, providerConfig.CustomProviderConfig.AllowedRequests.Responses)
}

func TestAccountXAIProvider(t *testing.T) {
	cfg := &pb.AiConfig{
		Enabled: true,
		Xai: &pb.OpenAiConfig{
			Model:       lo.ToPtr("grok-4.5"),
			ToolModel:   lo.ToPtr("grok-4.5"),
			BaseUrl:     lo.ToPtr("https://api.x.ai/v1"),
			ApiKey:      lo.ToPtr("xai-key"),
			ProxyModels: []string{"grok-4"},
		},
	}
	acct := &Account{
		consoleClient: &mockConsoleClient{cfg: cfg},
		tokenCache:    tokenexchange.NewCache(),
		logger:        zap.NewNop(),
	}

	providers, err := acct.GetConfiguredProviders()
	require.NoError(t, err)
	require.Contains(t, providers, schemas.XAI)

	keys, err := acct.GetKeysForProvider(context.Background(), schemas.XAI)
	require.NoError(t, err)
	require.Len(t, keys, 1)
	require.Equal(t, "xai-key", keys[0].Value.Val)
	require.ElementsMatch(t, []string{"grok-4.5", "grok-4.5", "grok-4"}, keys[0].Models)

	providerConfig, err := acct.GetConfigForProvider(schemas.XAI)
	require.NoError(t, err)
	require.Equal(t, "https://api.x.ai", providerConfig.NetworkConfig.BaseURL)
	require.Nil(t, providerConfig.CustomProviderConfig)
}
