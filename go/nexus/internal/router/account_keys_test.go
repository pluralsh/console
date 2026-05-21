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

func TestHandleBedrockKeys_accessTokenStatic(t *testing.T) {
	cfg := &pb.AiConfig{
		Enabled: true,
		Bedrock: &pb.BedrockConfig{
			ModelId:     lo.ToPtr("anthropic.claude-3-5-sonnet-20241022-v2:0"),
			Region:      lo.ToPtr("us-east-1"),
			AccessToken: lo.ToPtr("static-bedrock-token"),
		},
	}
	acct := &Account{
		consoleClient: &mockConsoleClient{cfg: cfg},
		tokenCache:    tokenexchange.NewCache(),
		logger:        zap.NewNop(),
	}

	keys, err := acct.GetKeysForProvider(context.Background(), schemas.Bedrock)
	require.NoError(t, err)
	require.Len(t, keys, 1)
	require.Equal(t, "static-bedrock-token", keys[0].Value.Val)
}

func TestHandleBedrockKeys_noBearerUsesIAMOnly(t *testing.T) {
	cfg := &pb.AiConfig{
		Enabled: true,
		Bedrock: &pb.BedrockConfig{
			ModelId:        lo.ToPtr("anthropic.claude-3-5-sonnet-20241022-v2:0"),
			Region:         lo.ToPtr("us-east-1"),
			AwsAccessKeyId: lo.ToPtr("AKIA"),
		},
	}
	acct := &Account{
		consoleClient: &mockConsoleClient{cfg: cfg},
		tokenCache:    tokenexchange.NewCache(),
		logger:        zap.NewNop(),
	}

	keys, err := acct.GetKeysForProvider(context.Background(), schemas.Bedrock)
	require.NoError(t, err)
	require.Len(t, keys, 1)
	require.Empty(t, keys[0].Value.Val)
	require.Equal(t, "AKIA", keys[0].BedrockKeyConfig.AccessKey.Val)
}

func TestHandleBedrockKeys_tokenExchangeUsesCache(t *testing.T) {
	var tokenCalls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenCalls.Add(1)
		_ = r.ParseForm()
		if r.FormValue("grant_type") != "client_credentials" {
			http.Error(w, "bad grant", http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"access_token":"bedrock-oauth-at","expires_in":3600}`))
	}))
	t.Cleanup(srv.Close)

	tokenURL := srv.URL + "/oauth/token"
	cfg := &pb.AiConfig{
		Enabled: true,
		Bedrock: &pb.BedrockConfig{
			ModelId: lo.ToPtr("anthropic.claude-3-5-sonnet-20241022-v2:0"),
			Region:  lo.ToPtr("us-east-1"),
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

	keys1, err := acct.GetKeysForProvider(ctx, schemas.Bedrock)
	require.NoError(t, err)
	require.Len(t, keys1, 1)
	require.Equal(t, "bedrock-oauth-at", keys1[0].Value.Val)
	c1 := tokenCalls.Load()
	require.GreaterOrEqual(t, c1, int32(1))

	keys2, err := acct.GetKeysForProvider(ctx, schemas.Bedrock)
	require.NoError(t, err)
	require.Equal(t, "bedrock-oauth-at", keys2[0].Value.Val)
	require.Equal(t, c1, tokenCalls.Load(), "second GetKeysForProvider should use cached OAuth token")
}

func TestHandleBedrockKeys_tokenExchangeEnabledIncomplete(t *testing.T) {
	cfg := &pb.AiConfig{
		Enabled: true,
		Bedrock: &pb.BedrockConfig{
			ModelId: lo.ToPtr("anthropic.claude-3-5-sonnet-20241022-v2:0"),
			Region:  lo.ToPtr("us-east-1"),
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
	_, err := acct.GetKeysForProvider(context.Background(), schemas.Bedrock)
	require.Error(t, err)
}

func TestGetConfigForProvider_bedrockBaseURLAndDisableStream(t *testing.T) {
	cfg := &pb.AiConfig{
		Enabled: true,
		Bedrock: &pb.BedrockConfig{
			ModelId:      lo.ToPtr("anthropic.claude-3-5-sonnet-20241022-v2:0"),
			Region:       lo.ToPtr("us-east-1"),
			BaseUrl:      lo.ToPtr("https://bedrock-proxy.example.com/"),
			EnableStream: lo.ToPtr(false),
		},
	}
	acct := &Account{
		consoleClient: &mockConsoleClient{cfg: cfg},
		tokenCache:    tokenexchange.NewCache(),
		logger:        zap.NewNop(),
	}

	providerCfg, err := acct.GetConfigForProvider(schemas.Bedrock)
	require.NoError(t, err)
	require.Equal(t, "https://bedrock-proxy.example.com", providerCfg.NetworkConfig.BaseURL)
	require.NotNil(t, providerCfg.CustomProviderConfig)
	require.False(t, providerCfg.CustomProviderConfig.AllowedRequests.ChatCompletionStream)
	require.False(t, providerCfg.CustomProviderConfig.AllowedRequests.ResponsesStream)
}
