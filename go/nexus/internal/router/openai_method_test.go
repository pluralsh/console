package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/maximhq/bifrost/core/providers/openai"
	"github.com/maximhq/bifrost/core/schemas"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
	"github.com/samber/lo"
	"github.com/stretchr/testify/require"
)

func TestOpenAIHTTPPolicyFromConfig(t *testing.T) {
	t.Parallel()

	chat := pb.OpenAiMethod_CHAT
	responses := pb.OpenAiMethod_RESPONSES
	auto := pb.OpenAiMethod_AUTO

	tests := []struct {
		name             string
		cfg              *pb.OpenAiConfig
		wantChat         bool
		wantResp         bool
		wantViaChat      bool
		wantViaResponses bool
	}{
		{
			name:             "nil config allows both",
			cfg:              nil,
			wantChat:         true,
			wantResp:         true,
			wantViaChat:      false,
			wantViaResponses: false,
		},
		{
			name:             "unset method allows both",
			cfg:              &pb.OpenAiConfig{},
			wantChat:         true,
			wantResp:         true,
			wantViaChat:      false,
			wantViaResponses: false,
		},
		{
			name:             "chat only routes responses via chat",
			cfg:              &pb.OpenAiConfig{Method: &chat},
			wantChat:         true,
			wantResp:         false,
			wantViaChat:      true,
			wantViaResponses: false,
		},
		{
			name:             "responses only routes chat via responses",
			cfg:              &pb.OpenAiConfig{Method: &responses},
			wantChat:         false,
			wantResp:         true,
			wantViaChat:      false,
			wantViaResponses: true,
		},
		{
			name:             "auto allows both",
			cfg:              &pb.OpenAiConfig{Method: &auto},
			wantChat:         true,
			wantResp:         true,
			wantViaChat:      false,
			wantViaResponses: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			policy := openAIHTTPPolicyFromConfig(tt.cfg)
			require.Equal(t, tt.wantChat, policy.allowsRoute(string(RouteChatCompletions)))
			require.Equal(t, tt.wantResp, policy.allowsRoute(string(RouteResponses)))
			require.Equal(t, tt.wantViaChat, policy.responsesViaChat())
			require.Equal(t, tt.wantViaResponses, policy.chatViaResponses())
			require.True(t, policy.allowsRoute(string(RouteEmbeddings)))
		})
	}
}

func TestResolveOpenAIProviderForModel(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		cfg          *pb.AiConfig
		model        string
		wantProvider schemas.ModelProvider
		wantConfig   *pb.OpenAiConfig
	}{
		{
			name:         "openai only uses openai",
			cfg:          &pb.AiConfig{Openai: &pb.OpenAiConfig{Model: lo.ToPtr("gpt-4o")}},
			model:        "gpt-4o",
			wantProvider: schemas.OpenAI,
		},
		{
			name:         "compatible only uses compatible",
			cfg:          &pb.AiConfig{OpenaiCompatible: &pb.OpenAiConfig{Model: lo.ToPtr("llama")}},
			model:        "llama",
			wantProvider: openAICompatibleProvider,
		},
		{
			name: "side by side prefers compatible for compatible-only model",
			cfg: &pb.AiConfig{
				Openai:           &pb.OpenAiConfig{Model: lo.ToPtr("gpt-4o")},
				OpenaiCompatible: &pb.OpenAiConfig{ProxyModels: []string{"llama"}},
			},
			model:        "llama",
			wantProvider: openAICompatibleProvider,
		},
		{
			name: "side by side keeps openai for shared model",
			cfg: &pb.AiConfig{
				Openai:           &pb.OpenAiConfig{Model: lo.ToPtr("gpt-4o")},
				OpenaiCompatible: &pb.OpenAiConfig{Model: lo.ToPtr("gpt-4o")},
			},
			model:        "gpt-4o",
			wantProvider: schemas.OpenAI,
		},
		{
			name: "openai alias can resolve to xai model",
			cfg: &pb.AiConfig{
				Openai: &pb.OpenAiConfig{Model: lo.ToPtr("gpt-4o")},
				Xai:    &pb.OpenAiConfig{Model: lo.ToPtr("grok-4.5")},
			},
			model:        "grok-4.5",
			wantProvider: schemas.XAI,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			provider, cfg := resolveOpenAIProviderForModel(tt.cfg, tt.model)
			require.Equal(t, tt.wantProvider, provider)
			if tt.wantProvider == schemas.XAI {
				require.Same(t, tt.cfg.GetXai(), cfg)
			} else if tt.wantProvider == openAICompatibleProvider {
				require.Same(t, tt.cfg.GetOpenaiCompatible(), cfg)
			} else {
				require.Same(t, tt.cfg.GetOpenai(), cfg)
			}
		})
	}
}

func TestOpenAIRoutePreCallbackUsesCompatibleMethodForOpenAIAlias(t *testing.T) {
	t.Parallel()

	chat := pb.OpenAiMethod_CHAT
	router := &OpenAIRouter{
		consoleClient: &mockConsoleClient{cfg: &pb.AiConfig{
			Enabled: true,
			Openai: &pb.OpenAiConfig{
				Model:  lo.ToPtr("gpt-4o"),
				Method: lo.ToPtr(pb.OpenAiMethod_AUTO),
			},
			OpenaiCompatible: &pb.OpenAiConfig{
				Model:  lo.ToPtr("llama"),
				Method: &chat,
			},
		}},
	}
	ctx, _ := schemas.NewBifrostContextWithCancel(context.Background())
	req := &openai.OpenAIResponsesRequest{Model: "openai/llama"}

	err := router.openAIRoutePreCallback(string(RouteResponses))(httptest.NewRequest(http.MethodPost, string(RouteResponses), nil), ctx, req)
	require.NoError(t, err)
	require.True(t, responsesViaChat(ctx))
}

func TestOpenAIRoutePreCallbackUsesXAIMethod(t *testing.T) {
	t.Parallel()

	responses := pb.OpenAiMethod_RESPONSES
	router := &OpenAIRouter{
		consoleClient: &mockConsoleClient{cfg: &pb.AiConfig{
			Enabled: true,
			Xai: &pb.OpenAiConfig{
				Model:  lo.ToPtr("grok-4.5"),
				Method: &responses,
			},
		}},
	}
	ctx, _ := schemas.NewBifrostContextWithCancel(context.Background())
	req := &openai.OpenAIChatRequest{Model: "xai/grok-4.5"}

	err := router.openAIRoutePreCallback(string(RouteChatCompletions))(httptest.NewRequest(http.MethodPost, string(RouteChatCompletions), nil), ctx, req)
	require.NoError(t, err)
	require.True(t, chatViaResponses(ctx))
}

func TestResolveModelXAI(t *testing.T) {
	t.Parallel()

	cfg := &pb.OpenAiConfig{Model: lo.ToPtr("grok-4.5")}
	router := &OpenAIRouter{
		consoleClient: &mockConsoleClient{cfg: &pb.AiConfig{
			Enabled: true,
			Xai:     cfg,
		}},
	}

	provider, model, gotCfg, err := router.resolveModel(context.Background(), "xai/grok-4.5")
	require.NoError(t, err)
	require.Equal(t, schemas.XAI, provider)
	require.Equal(t, "grok-4.5", model)
	require.Same(t, cfg, gotCfg)
}
