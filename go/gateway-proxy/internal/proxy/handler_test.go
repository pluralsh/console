package proxy

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/gateway-proxy/internal/fakegateway"
	"github.com/pluralsh/console/go/gateway-proxy/internal/oauth"
)

const testAPIKey = "sk-proxy-test"

func newTestProxy(t *testing.T, gw *fakegateway.Server, mutate ...func(*Options, *oauth.Credentials)) *httptest.Server {
	t.Helper()
	creds := oauth.Credentials{TokenURL: gw.TokenURL(), ClientID: fakegateway.ClientID, ClientSecret: fakegateway.ClientSecret}
	opts := Options{
		APIKey:            testAPIKey,
		Request:           RequestOptions{ResolveModel: func(m string) string { return map[string]string{"claude-opus-4-7": "claude-4.7-opus"}[m] }},
		KeepaliveInterval: time.Second,
		Timeout:           5 * time.Second,
		Logger:            slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
	for _, fn := range mutate {
		fn(&opts, &creds)
	}

	tokens, err := oauth.NewCache(creds)
	require.NoError(t, err)
	opts.Gateway = &Gateway{BaseURL: gw.URL, Tokens: tokens, Client: gw.Client(), Timeout: opts.Timeout}

	srv := httptest.NewServer(NewHandler(opts))
	t.Cleanup(srv.Close)
	return srv
}

func newGateway(t *testing.T) *fakegateway.Server {
	gw := fakegateway.New()
	t.Cleanup(gw.Close)
	return gw
}

func post(t *testing.T, srv *httptest.Server, path, body string, headers ...string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodPost, srv.URL+path, strings.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", testAPIKey)
	for i := 0; i+1 < len(headers); i += 2 {
		if headers[i+1] == "" {
			req.Header.Del(headers[i])
			continue
		}
		req.Header.Set(headers[i], headers[i+1])
	}
	resp, err := srv.Client().Do(req)
	require.NoError(t, err)
	t.Cleanup(func() { _ = resp.Body.Close() })
	return resp
}

func readBody(t *testing.T, resp *http.Response) string {
	t.Helper()
	b, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	return string(b)
}

func assertAnthropicError(t *testing.T, resp *http.Response, status int, errType string) map[string]any {
	t.Helper()
	assert.Equal(t, status, resp.StatusCode)
	body := decodeJSON(t, []byte(readBody(t, resp)))
	assert.Equal(t, "error", body["type"])
	errObj := body["error"].(map[string]any)
	assert.Equal(t, errType, errObj["type"])
	return errObj
}

const simpleRequest = `{"model":"claude-opus-4-7","max_tokens":256,"messages":[{"role":"user","content":"hello there"}]}`

func streamRequest() string {
	return strings.Replace(simpleRequest, `"max_tokens"`, `"stream":true,"max_tokens"`, 1)
}

func TestAuthentication(t *testing.T) {
	gw := newGateway(t)
	srv := newTestProxy(t, gw)

	assertAnthropicError(t, post(t, srv, "/v1/messages", simpleRequest, "x-api-key", ""), 401, "authentication_error")
	assertAnthropicError(t, post(t, srv, "/v1/messages", simpleRequest, "x-api-key", "wrong"), 401, "authentication_error")
	assert.Empty(t, gw.Requests(), "unauthenticated requests never reach the gateway")

	resp := post(t, srv, "/v1/messages", simpleRequest, "x-api-key", "", "Authorization", "Bearer "+testAPIKey)
	assert.Equal(t, 200, resp.StatusCode, readBody(t, resp))

	health, err := http.Get(srv.URL + "/health")
	require.NoError(t, err)
	defer health.Body.Close()
	assert.Equal(t, 200, health.StatusCode)
}

func TestNonStreamingMessage(t *testing.T) {
	gw := newGateway(t)
	gw.Responder = func(fakegateway.Request) fakegateway.Reply {
		return fakegateway.Reply{
			Response: fakegateway.TextResponse("echo: hello there"),
			Header:   http.Header{"X-Ratelimit-Remaining": {"95"}},
		}
	}
	srv := newTestProxy(t, gw)

	body := `{"model":"claude-opus-4-7","max_tokens":256,"service_tier":"auto","messages":[{"role":"user","content":"hello there"}]}`
	resp := post(t, srv, "/v1/messages", body, "Client-Correlation-Id", "corr-123", "anthropic-beta", "interleaved-thinking-2025-05-14")
	require.Equal(t, 200, resp.StatusCode)
	assert.Equal(t, "corr-123", resp.Header.Get("request-id"))
	assert.Equal(t, "95", resp.Header.Get("X-RateLimit-Remaining"))
	assert.Equal(t, "application/json", resp.Header.Get("Content-Type"))

	msg := decodeJSON(t, []byte(readBody(t, resp)))
	assert.Equal(t, "message", msg["type"])
	assert.Equal(t, "claude-opus-4-7", msg["model"])
	assert.Equal(t, "end_turn", msg["stop_reason"])
	assert.Equal(t, []any{map[string]any{"type": "text", "text": "echo: hello there"}}, msg["content"])

	reqs := gw.Requests()
	require.Len(t, reqs, 1)
	assert.Equal(t, "claude-4.7-opus", reqs[0].ModelID)
	assert.False(t, reqs[0].Stream)
	assert.Equal(t, "corr-123", reqs[0].Header.Get("Client-Correlation-Id"))
	assert.Equal(t, "5000", reqs[0].Header.Get("Request-Timeout-Ms"))
	assert.Equal(t, "Bearer token-1", reqs[0].Header.Get("Authorization"))
	assert.Equal(t, []any{"interleaved-thinking-2025-05-14"}, reqs[0].Body["anthropic_beta"])
}

func TestGeneratesRequestID(t *testing.T) {
	gw := newGateway(t)
	srv := newTestProxy(t, gw)

	resp := post(t, srv, "/v1/messages", simpleRequest)
	require.Equal(t, 200, resp.StatusCode)
	id := resp.Header.Get("request-id")
	assert.True(t, strings.HasPrefix(id, "req_"), id)
	assert.Equal(t, id, gw.Requests()[0].Header.Get("Client-Correlation-Id"))
}

func TestGatewayErrorsAreTranslated(t *testing.T) {
	gw := newGateway(t)
	gw.Responder = func(fakegateway.Request) fakegateway.Reply {
		return fakegateway.Reply{Status: 429, Message: "slow down", Header: http.Header{"Retry-After": {"7"}}}
	}
	srv := newTestProxy(t, gw)

	resp := post(t, srv, "/v1/messages", simpleRequest)
	errObj := assertAnthropicError(t, resp, 429, "rate_limit_error")
	assert.Equal(t, "slow down (gateway request_id: fake/req-1)", errObj["message"])
	assert.Equal(t, "7", resp.Header.Get("Retry-After"))
}

func TestInvalidRequestIsRejectedLocally(t *testing.T) {
	gw := newGateway(t)
	srv := newTestProxy(t, gw)

	assertAnthropicError(t, post(t, srv, "/v1/messages", `{"model":"claude-opus-4-7","messages":[]}`), 400, "invalid_request_error")
	assert.Empty(t, gw.Requests())
}

func TestTokensAreCachedAndRefreshedWhenRevoked(t *testing.T) {
	gw := newGateway(t)
	srv := newTestProxy(t, gw)

	for range 5 {
		resp := post(t, srv, "/v1/messages", simpleRequest)
		require.Equal(t, 200, resp.StatusCode)
	}
	assert.Equal(t, 1, gw.TokenCalls())

	gw.RevokeTokens()
	resp := post(t, srv, "/v1/messages", simpleRequest)
	require.Equal(t, 200, resp.StatusCode, readBody(t, resp))
	assert.Equal(t, 2, gw.TokenCalls(), "a 401 from the gateway triggers exactly one token refresh")
	assert.Equal(t, "Bearer token-2", gw.Requests()[len(gw.Requests())-1].Header.Get("Authorization"))
}

func TestBadOAuthCredentials(t *testing.T) {
	gw := newGateway(t)
	srv := newTestProxy(t, gw, func(_ *Options, c *oauth.Credentials) { c.ClientSecret = "wrong" })

	errObj := assertAnthropicError(t, post(t, srv, "/v1/messages", simpleRequest), 502, "api_error")
	assert.Contains(t, errObj["message"], "failed to obtain gateway OAuth token")
}

func TestUpstreamTimeout(t *testing.T) {
	gw := newGateway(t)
	gw.Responder = func(fakegateway.Request) fakegateway.Reply {
		return fakegateway.Reply{Response: fakegateway.TextResponse("late"), Delay: 2 * time.Second}
	}
	srv := newTestProxy(t, gw, func(o *Options, _ *oauth.Credentials) { o.Timeout = 100 * time.Millisecond })

	assertAnthropicError(t, post(t, srv, "/v1/messages", simpleRequest), 504, "timeout_error")
}

func TestUnsupportedRoutes(t *testing.T) {
	gw := newGateway(t)
	srv := newTestProxy(t, gw)

	assertAnthropicError(t, post(t, srv, "/v1/messages/count_tokens", simpleRequest), 404, "not_found_error")
	assertAnthropicError(t, post(t, srv, "/v1/complete", simpleRequest), 404, "not_found_error")
}

func TestSynthesizedStreaming(t *testing.T) {
	gw := newGateway(t)
	srv := newTestProxy(t, gw)

	plain := decodeJSON(t, []byte(readBody(t, post(t, srv, "/v1/messages", simpleRequest))))

	resp := post(t, srv, "/v1/messages", streamRequest())
	require.Equal(t, 200, resp.StatusCode)
	assert.Equal(t, "text/event-stream; charset=utf-8", resp.Header.Get("Content-Type"))

	events := parseSSE(t, readBody(t, resp))
	assert.Equal(t, "message_start", events[0].Name)
	assert.Equal(t, "message_stop", events[len(events)-1].Name)
	assert.Equal(t, plain, accumulate(t, events))

	reqs := gw.Requests()
	assert.False(t, reqs[len(reqs)-1].Stream, "synthesize mode uses the non-streaming invoke endpoint")
}

func TestSynthesizedStreamingKeepalive(t *testing.T) {
	gw := newGateway(t)
	gw.Responder = func(req fakegateway.Request) fakegateway.Reply {
		reply := fakegateway.EchoResponder(req)
		reply.Delay = 200 * time.Millisecond
		return reply
	}
	srv := newTestProxy(t, gw, func(o *Options, _ *oauth.Credentials) { o.KeepaliveInterval = 30 * time.Millisecond })

	resp := post(t, srv, "/v1/messages", streamRequest())
	require.Equal(t, 200, resp.StatusCode)
	events := parseSSE(t, readBody(t, resp))

	assert.Equal(t, "ping", events[0].Name, "pings are sent while waiting on the gateway")
	msg := accumulate(t, events)
	assert.Equal(t, []any{map[string]any{"type": "text", "text": "echo: hello there"}}, msg["content"])
}

func TestSynthesizedStreamingFastErrorKeepsStatus(t *testing.T) {
	gw := newGateway(t)
	gw.Responder = func(fakegateway.Request) fakegateway.Reply {
		return fakegateway.Reply{Status: 400, Message: "bad tool schema"}
	}
	srv := newTestProxy(t, gw)

	resp := post(t, srv, "/v1/messages", streamRequest())
	errObj := assertAnthropicError(t, resp, 400, "invalid_request_error")
	assert.Contains(t, errObj["message"], "bad tool schema")
}

func TestSynthesizedStreamingSlowErrorBecomesErrorEvent(t *testing.T) {
	gw := newGateway(t)
	gw.Responder = func(fakegateway.Request) fakegateway.Reply {
		return fakegateway.Reply{Status: 503, Message: "overloaded", Delay: 150 * time.Millisecond}
	}
	srv := newTestProxy(t, gw, func(o *Options, _ *oauth.Credentials) { o.KeepaliveInterval = 30 * time.Millisecond })

	resp := post(t, srv, "/v1/messages", streamRequest())
	require.Equal(t, 200, resp.StatusCode)
	events := parseSSE(t, readBody(t, resp))

	last := events[len(events)-1]
	assert.Equal(t, "error", last.Name)
	assert.Equal(t, "overloaded_error", last.Data["error"].(map[string]any)["type"])
}

func TestUpstreamStreaming(t *testing.T) {
	gw := newGateway(t)
	srv := newTestProxy(t, gw, func(o *Options, _ *oauth.Credentials) { o.UpstreamStreaming = true })

	resp := post(t, srv, "/v1/messages", streamRequest())
	require.Equal(t, 200, resp.StatusCode)
	body := readBody(t, resp)
	assert.NotContains(t, body, "amazon-bedrock-invocationMetrics")

	events := parseSSE(t, body)
	textDeltas := 0
	for _, e := range events {
		if e.Name == "content_block_delta" {
			textDeltas++
		}
	}
	assert.Greater(t, textDeltas, 1, "upstream deltas are forwarded individually")

	msg := accumulate(t, events)
	assert.Equal(t, "claude-opus-4-7", msg["model"])
	assert.Equal(t, []any{map[string]any{"type": "text", "text": "echo: hello there"}}, msg["content"])

	reqs := gw.Requests()
	require.Len(t, reqs, 1)
	assert.True(t, reqs[0].Stream)
	assert.Equal(t, "claude-4.7-opus", reqs[0].ModelID)
}

func TestUpstreamStreamingErrorKeepsStatus(t *testing.T) {
	gw := newGateway(t)
	gw.Responder = func(fakegateway.Request) fakegateway.Reply {
		return fakegateway.Reply{Status: 403, Message: "model not enabled"}
	}
	srv := newTestProxy(t, gw, func(o *Options, _ *oauth.Credentials) { o.UpstreamStreaming = true })

	assertAnthropicError(t, post(t, srv, "/v1/messages", streamRequest()), 403, "permission_error")
}

func TestUpstreamStreamingJSONFallback(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/oauth/token" {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"access_token":"t","expires_in":3600}`))
			return
		}
		assert.True(t, strings.HasSuffix(r.URL.Path, "/invoke-with-response-stream"))
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"bedrock_1","type":"message","role":"assistant","model":"x","content":[{"type":"text","text":"whole"}],"stop_reason":"end_turn","usage":{"input_tokens":1,"output_tokens":1}}`))
	}))
	t.Cleanup(upstream.Close)

	tokens, err := oauth.NewCache(oauth.Credentials{TokenURL: upstream.URL + "/oauth/token", ClientID: "a", ClientSecret: "b"})
	require.NoError(t, err)
	srv := httptest.NewServer(NewHandler(Options{
		APIKey:            testAPIKey,
		Gateway:           &Gateway{BaseURL: upstream.URL, Tokens: tokens, Client: upstream.Client()},
		UpstreamStreaming: true,
		Logger:            slog.New(slog.NewTextHandler(io.Discard, nil)),
	}))
	t.Cleanup(srv.Close)

	resp := post(t, srv, "/v1/messages", streamRequest())
	require.Equal(t, 200, resp.StatusCode)
	msg := accumulate(t, parseSSE(t, readBody(t, resp)))
	assert.Equal(t, []any{map[string]any{"type": "text", "text": "whole"}}, msg["content"])
}
