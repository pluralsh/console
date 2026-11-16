package router

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/log"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
	"github.com/samber/lo"
	"github.com/stretchr/testify/require"
)

func TestDecisionTargets(t *testing.T) {
	t.Parallel()

	cfg := &pb.AiConfig{
		Enabled:   true,
		Provider:  lo.ToPtr("anthropic"),
		Openai:    &pb.OpenAiConfig{Model: lo.ToPtr("gpt-5.6-luna"), DecisionModel: lo.ToPtr("gpt-6-luna")},
		Anthropic: &pb.AnthropicConfig{Model: lo.ToPtr("claude-haiku"), ToolModel: lo.ToPtr("claude-sonnet"), DecisionModel: lo.ToPtr("claude-haiku")},
		Bedrock:   &pb.BedrockConfig{ModelId: lo.ToPtr("global.anthropic.claude-haiku-4-5"), DecisionModelId: lo.ToPtr("global.anthropic.claude-haiku-4-5")},
	}

	require.Equal(t, []decisionTarget{
		{Provider: schemas.OpenAI, Model: "gpt-6-luna"},
		{Provider: schemas.Anthropic, Model: "claude-haiku", Emulate: true},
		{Provider: schemas.Bedrock, Model: "anthropic.claude-haiku-4-5", Emulate: true},
		{Provider: schemas.Anthropic, Model: "claude-sonnet", Emulate: true},
	}, decisionTargets(cfg))

	t.Run("decision provider goes first", func(t *testing.T) {
		withProvider := &pb.AiConfig{
			Enabled:          cfg.Enabled,
			Provider:         cfg.Provider,
			DecisionProvider: lo.ToPtr("bedrock"),
			Openai:           cfg.Openai,
			Anthropic:        cfg.Anthropic,
			Bedrock:          cfg.Bedrock,
		}
		require.Equal(t, decisionTarget{Provider: schemas.Bedrock, Model: "anthropic.claude-haiku-4-5", Emulate: true}, decisionTargets(withProvider)[0])
	})

	t.Run("falls back to the default provider's models", func(t *testing.T) {
		require.Equal(t, []decisionTarget{
			{Provider: schemas.Vertex, Model: "gemini-flash", Emulate: true},
			{Provider: schemas.Vertex, Model: "gemini-pro", Emulate: true},
		}, decisionTargets(&pb.AiConfig{
			Enabled:  true,
			Provider: lo.ToPtr("vertex"),
			VertexAi: &pb.VertexAiConfig{Model: lo.ToPtr("gemini-flash"), ToolModel: lo.ToPtr("gemini-pro")},
		}))
	})

	t.Run("nothing when ai is disabled", func(t *testing.T) {
		require.Empty(t, decisionTargets(&pb.AiConfig{Openai: cfg.Openai}))
	})
}

func TestOpenAIDecisionsRoute(t *testing.T) {
	require.NoError(t, log.Init("error"))

	var mu sync.Mutex
	var calls []string
	nativeStatus := http.StatusOK
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		var req struct {
			Model string `json:"model"`
		}
		_ = json.Unmarshal(body, &req)
		mu.Lock()
		calls = append(calls, r.URL.Path+" "+req.Model)
		status := nativeStatus
		mu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.HasSuffix(r.URL.Path, "/decisions") && status != http.StatusOK:
			w.WriteHeader(status)
			_, _ = fmt.Fprint(w, `{"error":{"message":"not a decision model","type":"invalid_request_error"}}`)
		case strings.HasSuffix(r.URL.Path, "/decisions"):
			_, _ = fmt.Fprint(w, `{"model":"gpt-6-luna","answers":[{"type":"choice","name":"verdict","choice":"allow","confidence":0.97}]}`)
		case strings.HasSuffix(r.URL.Path, "/responses"):
			args := `{\"verdict\":{\"choice\":\"deny\",\"confidence\":0.8,\"probabilities\":{\"allow\":0.1,\"deny\":0.8,\"ask\":0.1}}}`
			_, _ = fmt.Fprintf(w, `{"id":"resp_1","object":"response","status":"completed","model":"gpt-5.6-luna","output":[{"type":"function_call","id":"fc_1","call_id":"call_1","name":"emit_decision","arguments":"%s","status":"completed"}]}`, args)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(upstream.Close)

	handler, err := NewHandler(&mockConsoleClient{cfg: &pb.AiConfig{
		Enabled:  true,
		Provider: lo.ToPtr("openai"),
		Openai: &pb.OpenAiConfig{
			Model: lo.ToPtr("gpt-5.6-luna"), DecisionModel: lo.ToPtr("gpt-6-luna"), ApiKey: lo.ToPtr("test-key"), BaseUrl: &upstream.URL,
		},
	}})
	require.NoError(t, err)
	t.Cleanup(handler.Shutdown)

	request := `{"model":"auto","input":"rm -rf /tmp/build","questions":[{"type":"choice","name":"verdict","instructions":"should this run?","choices":[{"value":"allow"},{"value":"deny"},{"value":"ask"}]}]}`
	decide := func() (int, map[string]any) {
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, httptest.NewRequest(http.MethodPost, string(RouteDecisions), strings.NewReader(request)))
		var body map[string]any
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body), response.Body.String())
		return response.Code, body
	}
	choice := func(body map[string]any) any {
		return body["answers"].([]any)[0].(map[string]any)["choice"]
	}

	t.Run("native decision model", func(t *testing.T) {
		code, body := decide()
		require.Equal(t, http.StatusOK, code, body)
		require.Equal(t, "allow", choice(body))
		require.Equal(t, []string{"/v1/decisions gpt-6-luna"}, calls)
	})

	t.Run("emulates the default model when the native call fails", func(t *testing.T) {
		mu.Lock()
		calls, nativeStatus = nil, http.StatusBadRequest
		mu.Unlock()

		code, body := decide()
		require.Equal(t, http.StatusOK, code, body)
		require.Equal(t, "deny", choice(body))
		require.Equal(t, []string{"/v1/decisions gpt-6-luna", "/v1/responses gpt-5.6-luna"}, calls)
	})
}
