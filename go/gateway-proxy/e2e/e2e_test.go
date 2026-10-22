// Package e2e drives gateway-proxy with the official Anthropic Go SDK against a fake FM gateway
// that implements the OAuth token endpoint and the Bedrock invoke API from gateway.yaml.
package e2e

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/gateway-proxy/internal/app"
	"github.com/pluralsh/console/go/gateway-proxy/internal/config"
	"github.com/pluralsh/console/go/gateway-proxy/internal/fakegateway"
)

const (
	apiKey         = "sk-gateway-proxy-e2e"
	clientModel    = "claude-opus-4-7"
	gatewayModelID = "claude-4.7-opus"
)

var streamingModes = []string{string(config.StreamingSynthesize), string(config.StreamingUpstream)}

type harness struct {
	gateway  *fakegateway.Server
	proxyURL string
	client   anthropic.Client
}

func setup(t *testing.T, env map[string]string) *harness {
	t.Helper()
	gw := fakegateway.New()
	t.Cleanup(gw.Close)

	vars := map[string]string{
		"PROXY_API_KEY":       apiKey,
		"GATEWAY_URL":         gw.URL,
		"GATEWAY_MODEL_MAP":   clientModel + "=" + gatewayModelID,
		"OAUTH_TOKEN_URL":     gw.TokenURL(),
		"OAUTH_CLIENT_ID":     fakegateway.ClientID,
		"OAUTH_CLIENT_SECRET": fakegateway.ClientSecret,
	}
	for k, v := range env {
		vars[k] = v
	}
	cfg, err := config.LoadFrom(func(k string) (string, bool) { v, ok := vars[k]; return v, ok })
	require.NoError(t, err)

	handler, err := app.NewHandler(cfg, gw.Client(), slog.New(slog.NewTextHandler(io.Discard, nil)))
	require.NoError(t, err)
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)

	return &harness{gateway: gw, proxyURL: srv.URL, client: newClient(srv.URL, apiKey)}
}

func newClient(baseURL, key string) anthropic.Client {
	return anthropic.NewClient(
		option.WithBaseURL(baseURL),
		option.WithAPIKey(key),
		option.WithMaxRetries(0),
		option.WithRequestTimeout(10*time.Second),
	)
}

func userText(text string) anthropic.MessageNewParams {
	return anthropic.MessageNewParams{
		Model:     clientModel,
		MaxTokens: 512,
		Messages:  []anthropic.MessageParam{anthropic.NewUserMessage(anthropic.NewTextBlock(text))},
	}
}

func stream(t *testing.T, client anthropic.Client, params anthropic.MessageNewParams) (anthropic.Message, []string, error) {
	t.Helper()
	s := client.Messages.NewStreaming(context.Background(), params)
	defer s.Close()

	var msg anthropic.Message
	var types []string
	for s.Next() {
		event := s.Current()
		types = append(types, event.Type)
		require.NoError(t, msg.Accumulate(event))
	}
	return msg, types, s.Err()
}

func textOf(msg anthropic.Message) string {
	var out string
	for _, block := range msg.Content {
		if text, ok := block.AsAny().(anthropic.TextBlock); ok {
			out += text.Text
		}
	}
	return out
}

func TestMessagesNew(t *testing.T) {
	h := setup(t, nil)

	msg, err := h.client.Messages.New(context.Background(), userText("hello gateway"))
	require.NoError(t, err)

	assert.Equal(t, "echo: hello gateway", textOf(*msg))
	assert.Equal(t, anthropic.Model(clientModel), msg.Model)
	assert.Equal(t, anthropic.StopReasonEndTurn, msg.StopReason)
	assert.EqualValues(t, 12, msg.Usage.InputTokens)
	assert.EqualValues(t, 3, msg.Usage.OutputTokens)

	reqs := h.gateway.Requests()
	require.Len(t, reqs, 1)
	assert.Equal(t, gatewayModelID, reqs[0].ModelID)
	assert.Equal(t, "bedrock-2023-05-31", reqs[0].Body["anthropic_version"])
}

func TestStreaming(t *testing.T) {
	for _, mode := range streamingModes {
		t.Run(mode, func(t *testing.T) {
			h := setup(t, map[string]string{"GATEWAY_STREAMING_MODE": mode})

			msg, types, err := stream(t, h.client, userText("stream this back to me"))
			require.NoError(t, err)

			assert.Equal(t, "message_start", types[0])
			assert.Equal(t, "message_stop", types[len(types)-1])
			assert.Equal(t, "echo: stream this back to me", textOf(msg))
			assert.Equal(t, anthropic.Model(clientModel), msg.Model)
			assert.Equal(t, anthropic.StopReasonEndTurn, msg.StopReason)
			assert.EqualValues(t, 6, msg.Usage.OutputTokens)

			reqs := h.gateway.Requests()
			require.Len(t, reqs, 1)
			assert.Equal(t, mode == string(config.StreamingUpstream), reqs[0].Stream)
		})
	}
}

func TestToolUseRoundTrip(t *testing.T) {
	for _, mode := range streamingModes {
		for _, streaming := range []bool{false, true} {
			name := mode
			if streaming {
				name += "/stream"
			}
			t.Run(name, func(t *testing.T) {
				h := setup(t, map[string]string{"GATEWAY_STREAMING_MODE": mode})

				params := userText("what's the weather?")
				params.Tools = []anthropic.ToolUnionParam{{OfTool: &anthropic.ToolParam{
					Name:        "get_weather",
					Description: anthropic.String("Current weather for a city"),
					InputSchema: anthropic.ToolInputSchemaParam{
						Properties: map[string]any{"city": map[string]any{"type": "string"}},
						Required:   []string{"city"},
					},
				}}}

				call := func() anthropic.Message {
					if !streaming {
						msg, err := h.client.Messages.New(context.Background(), params)
						require.NoError(t, err)
						return *msg
					}
					msg, _, err := stream(t, h.client, params)
					require.NoError(t, err)
					return msg
				}

				first := call()
				require.Equal(t, anthropic.StopReasonToolUse, first.StopReason)
				require.Len(t, first.Content, 2)
				toolUse, ok := first.Content[1].AsAny().(anthropic.ToolUseBlock)
				require.True(t, ok, "second block is tool_use")
				assert.Equal(t, "get_weather", toolUse.Name)

				var input struct{ City string }
				require.NoError(t, json.Unmarshal(toolUse.Input, &input))
				assert.Equal(t, "Paris", input.City)

				params.Messages = append(params.Messages,
					first.ToParam(),
					anthropic.NewUserMessage(anthropic.NewToolResultBlock(toolUse.ID, "18C and sunny", false)),
				)
				second := call()
				assert.Equal(t, anthropic.StopReasonEndTurn, second.StopReason)
				assert.Equal(t, "echo: tool said 18C and sunny", textOf(second))

				// The assistant turn with tool_use and the tool_result reached the gateway intact.
				last := h.gateway.Requests()[1].Body["messages"].([]any)
				require.Len(t, last, 3)
				assistant := last[1].(map[string]any)["content"].([]any)
				assert.Equal(t, "tool_use", assistant[1].(map[string]any)["type"])
				assert.Equal(t, map[string]any{"city": "Paris"}, assistant[1].(map[string]any)["input"])
			})
		}
	}
}

func TestThinkingAndSystemPrompt(t *testing.T) {
	for _, mode := range streamingModes {
		t.Run(mode, func(t *testing.T) {
			h := setup(t, map[string]string{"GATEWAY_STREAMING_MODE": mode})
			h.gateway.Responder = func(fakegateway.Request) fakegateway.Reply {
				resp := fakegateway.TextResponse("The answer is 4.")
				resp["content"] = []any{
					map[string]any{"type": "thinking", "thinking": "2 + 2 = 4", "signature": "sig-xyz"},
					map[string]any{"type": "text", "text": "The answer is 4."},
				}
				return fakegateway.Reply{Response: resp}
			}

			params := userText("what is 2+2?")
			params.MaxTokens = 4096
			params.System = []anthropic.TextBlockParam{{Text: "You are a calculator."}}
			params.Thinking = anthropic.ThinkingConfigParamOfEnabled(2048)

			msg, _, err := stream(t, h.client, params)
			require.NoError(t, err)

			require.Len(t, msg.Content, 2)
			thinking, ok := msg.Content[0].AsAny().(anthropic.ThinkingBlock)
			require.True(t, ok)
			assert.Equal(t, "2 + 2 = 4", thinking.Thinking)
			assert.Equal(t, "sig-xyz", thinking.Signature)
			assert.Equal(t, "The answer is 4.", textOf(msg))

			body := h.gateway.Requests()[0].Body
			assert.Equal(t, []any{map[string]any{"type": "text", "text": "You are a calculator."}}, body["system"])
			assert.Equal(t, "enabled", body["thinking"].(map[string]any)["type"])
		})
	}
}

func TestInvalidAPIKey(t *testing.T) {
	h := setup(t, nil)

	client := newClient(h.proxyURL, "sk-wrong")
	_, err := client.Messages.New(context.Background(), userText("hi"))
	var apiErr *anthropic.Error
	require.True(t, errors.As(err, &apiErr), "got %v", err)
	assert.Equal(t, http.StatusUnauthorized, apiErr.StatusCode)
	assert.Contains(t, apiErr.Error(), "authentication_error")
	assert.Empty(t, h.gateway.Requests())
	assert.Zero(t, h.gateway.TokenCalls())
}

func TestGatewayErrorsReachClient(t *testing.T) {
	h := setup(t, nil)
	h.gateway.Responder = func(fakegateway.Request) fakegateway.Reply {
		return fakegateway.Reply{Status: http.StatusTooManyRequests, Message: "Request rate limit exceeded"}
	}

	_, err := h.client.Messages.New(context.Background(), userText("hi"))
	var apiErr *anthropic.Error
	require.True(t, errors.As(err, &apiErr), "got %v", err)
	assert.Equal(t, http.StatusTooManyRequests, apiErr.StatusCode)
	assert.Contains(t, apiErr.Error(), "rate_limit_error")
	assert.Contains(t, apiErr.Error(), "Request rate limit exceeded")

	_, _, err = stream(t, h.client, userText("hi"))
	require.True(t, errors.As(err, &apiErr), "streaming requests get the HTTP status too: %v", err)
	assert.Equal(t, http.StatusTooManyRequests, apiErr.StatusCode)
}

func TestSlowGatewayKeepsStreamAliveAndReportsLateErrors(t *testing.T) {
	h := setup(t, map[string]string{"GATEWAY_KEEPALIVE_INTERVAL": "25ms"})

	h.gateway.Responder = func(req fakegateway.Request) fakegateway.Reply {
		reply := fakegateway.EchoResponder(req)
		reply.Delay = 150 * time.Millisecond
		return reply
	}
	// The SDK swallows ping events; the proxy emitting them is covered by the handler tests.
	msg, _, err := stream(t, h.client, userText("take your time"))
	require.NoError(t, err)
	assert.Equal(t, "echo: take your time", textOf(msg))

	h.gateway.Responder = func(fakegateway.Request) fakegateway.Reply {
		return fakegateway.Reply{Status: http.StatusServiceUnavailable, Message: "Service temporarily unavailable", Delay: 150 * time.Millisecond}
	}
	_, _, err = stream(t, h.client, userText("this will fail"))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "overloaded_error")
}

func TestOAuthTokenIsCachedAndRefreshed(t *testing.T) {
	h := setup(t, nil)

	for range 5 {
		_, err := h.client.Messages.New(context.Background(), userText("hi"))
		require.NoError(t, err)
	}
	_, _, err := stream(t, h.client, userText("hi"))
	require.NoError(t, err)
	assert.Equal(t, 1, h.gateway.TokenCalls(), "one token serves every request until it expires")

	h.gateway.RevokeTokens()
	_, err = h.client.Messages.New(context.Background(), userText("after revoke"))
	require.NoError(t, err)
	assert.Equal(t, 2, h.gateway.TokenCalls())
}
