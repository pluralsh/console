package proxy

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPrepareRequestRewritesForGateway(t *testing.T) {
	body := `{
		"model": "claude-opus-4-7",
		"stream": true,
		"max_tokens": 1024,
		"system": [{"type": "text", "text": "be brief"}],
		"messages": [{"role": "user", "content": "hi"}],
		"temperature": 0.2,
		"tools": [{"name": "weather", "input_schema": {"type": "object"}}],
		"tool_choice": {"type": "auto"},
		"thinking": {"type": "enabled", "budget_tokens": 2048},
		"service_tier": "auto",
		"container": "abc",
		"mcp_servers": []
	}`
	prep, err := PrepareRequest([]byte(body), http.Header{}, RequestOptions{
		ResolveModel: func(m string) string { return map[string]string{"claude-opus-4-7": "claude-4.7-opus"}[m] },
	})
	require.Nil(t, err)

	assert.Equal(t, "claude-opus-4-7", prep.Model)
	assert.Equal(t, "claude-4.7-opus", prep.ModelID)
	assert.True(t, prep.Stream)
	assert.Equal(t, []string{"container", "mcp_servers", "service_tier"}, prep.Dropped)

	out := decodeJSON(t, prep.Body)
	assert.Equal(t, "bedrock-2023-05-31", out["anthropic_version"])
	assert.NotContains(t, out, "model")
	assert.NotContains(t, out, "stream")
	assert.NotContains(t, out, "anthropic_beta", "no betas means no field")
	for _, key := range []string{"max_tokens", "system", "messages", "temperature", "tools", "tool_choice", "thinking"} {
		assert.Contains(t, out, key)
	}
	assert.EqualValues(t, 1024, out["max_tokens"])
}

func TestPrepareRequestOverridesAnthropicVersion(t *testing.T) {
	prep, err := PrepareRequest([]byte(`{"model":"m","max_tokens":1,"messages":[],"anthropic_version":"2023-06-01"}`), http.Header{}, RequestOptions{})
	require.Nil(t, err)
	assert.Equal(t, "bedrock-2023-05-31", decodeJSON(t, prep.Body)["anthropic_version"])
}

func TestPrepareRequestMergesBetas(t *testing.T) {
	header := http.Header{}
	header.Add("anthropic-beta", "interleaved-thinking-2025-05-14, claude-code-20250219")
	header.Add("anthropic-beta", "context-1m-2025-08-07")
	body := `{"model":"m","max_tokens":1,"messages":[],"anthropic_beta":["computer-use-2024-10-22","context-1m-2025-08-07"]}`

	prep, err := PrepareRequest([]byte(body), header, RequestOptions{})
	require.Nil(t, err)
	assert.Equal(t,
		[]any{"computer-use-2024-10-22", "context-1m-2025-08-07", "interleaved-thinking-2025-05-14", "claude-code-20250219"},
		decodeJSON(t, prep.Body)["anthropic_beta"])

	prep, err = PrepareRequest([]byte(body), header, RequestOptions{BetaAllowlist: []string{"interleaved-thinking-2025-05-14"}})
	require.Nil(t, err)
	assert.Equal(t, []any{"interleaved-thinking-2025-05-14"}, decodeJSON(t, prep.Body)["anthropic_beta"])

	prep, err = PrepareRequest([]byte(body), header, RequestOptions{BetaAllowlist: []string{"nothing-matches"}})
	require.Nil(t, err)
	assert.NotContains(t, decodeJSON(t, prep.Body), "anthropic_beta")
}

func TestPrepareRequestStripsCacheControl(t *testing.T) {
	body := `{
		"model": "m", "max_tokens": 1,
		"system": [{"type": "text", "text": "sys", "cache_control": {"type": "ephemeral"}}],
		"messages": [{"role": "user", "content": [
			{"type": "text", "text": "hi", "cache_control": {"type": "ephemeral"}},
			{"type": "tool_result", "tool_use_id": "t1", "content": [{"type": "text", "text": "r", "cache_control": {"type": "ephemeral"}}]}
		]}],
		"tools": [{"name": "w", "input_schema": {"type": "object", "properties": {"n": {"type": "integer", "maximum": 12345678901234567890}}}, "cache_control": {"type": "ephemeral"}}]
	}`

	kept, err := PrepareRequest([]byte(body), http.Header{}, RequestOptions{})
	require.Nil(t, err)
	assert.Contains(t, string(kept.Body), "cache_control", "cache_control is forwarded by default")

	stripped, err := PrepareRequest([]byte(body), http.Header{}, RequestOptions{StripCacheControl: true})
	require.Nil(t, err)
	assert.NotContains(t, string(stripped.Body), "cache_control")
	assert.Contains(t, string(stripped.Body), "12345678901234567890", "large numbers survive re-encoding")
	assert.Contains(t, string(stripped.Body), `"tool_use_id":"t1"`)
}

func TestPrepareRequestValidation(t *testing.T) {
	cases := map[string]struct {
		body    string
		opts    RequestOptions
		wantMsg string
	}{
		"not json":         {body: `nope`, wantMsg: "must be a JSON object"},
		"array":            {body: `[]`, wantMsg: "must be a JSON object"},
		"missing model":    {body: `{"max_tokens":1,"messages":[]}`, wantMsg: "model: field required"},
		"bad model":        {body: `{"model":1,"max_tokens":1,"messages":[]}`, wantMsg: "model: must be a string"},
		"missing tokens":   {body: `{"model":"m","messages":[]}`, wantMsg: "max_tokens: field required"},
		"missing messages": {body: `{"model":"m","max_tokens":1}`, wantMsg: "messages: field required"},
		"bad stream":       {body: `{"model":"m","max_tokens":1,"messages":[],"stream":"yes"}`, wantMsg: "stream: must be a boolean"},
		"bad betas":        {body: `{"model":"m","max_tokens":1,"messages":[],"anthropic_beta":"x"}`, wantMsg: "anthropic_beta"},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := PrepareRequest([]byte(tc.body), http.Header{}, tc.opts)
			require.NotNil(t, err)
			assert.Equal(t, http.StatusBadRequest, err.Status)
			assert.Equal(t, "invalid_request_error", err.Type)
			assert.Contains(t, err.Message, tc.wantMsg)
		})
	}
}

func TestPrepareRequestDefaultModelFillsMissingModel(t *testing.T) {
	prep, err := PrepareRequest([]byte(`{"max_tokens":1,"messages":[]}`), http.Header{}, RequestOptions{
		ResolveModel: func(string) string { return "claude-4.7-opus" },
	})
	require.Nil(t, err)
	assert.Equal(t, "", prep.Model)
	assert.Equal(t, "claude-4.7-opus", prep.ModelID)
}
