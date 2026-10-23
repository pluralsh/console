package config

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func env(overrides map[string]string) func(string) (string, bool) {
	base := map[string]string{
		"PROXY_API_KEY":       "sk-proxy",
		"GATEWAY_URL":         "https://gateway.example.com/",
		"OAUTH_TOKEN_URL":     "https://idp.example.com/oauth/token",
		"OAUTH_CLIENT_ID":     "client",
		"OAUTH_CLIENT_SECRET": "secret",
	}
	for k, v := range overrides {
		base[k] = v
	}
	return func(key string) (string, bool) {
		v, ok := base[key]
		return v, ok
	}
}

func TestLoadDefaults(t *testing.T) {
	cfg, err := LoadFrom(env(nil))
	require.NoError(t, err)

	assert.Equal(t, ":8080", cfg.ListenAddr)
	assert.Equal(t, "https://gateway.example.com", cfg.GatewayURL, "trailing slash is trimmed")
	assert.Equal(t, StreamingSynthesize, cfg.StreamingMode)
	assert.Equal(t, 10*time.Minute, cfg.Timeout)
	assert.Equal(t, 10*time.Second, cfg.KeepaliveInterval)
	assert.False(t, cfg.StripCacheControl)
	assert.Empty(t, cfg.ModelMap)
	assert.Nil(t, cfg.BetaAllowlist)
}

func TestLoadFull(t *testing.T) {
	cfg, err := LoadFrom(env(map[string]string{
		"PROXY_LISTEN_ADDR":           "127.0.0.1:9000",
		"GATEWAY_MODEL_ID":            "claude-4.7-opus",
		"GATEWAY_MODEL_MAP":           "claude-opus-4-7=claude-4.7-opus, claude-sonnet-4-5 = claude-4.5-sonnet",
		"GATEWAY_TIMEOUT":             "90s",
		"GATEWAY_STREAMING_MODE":      "UPSTREAM",
		"GATEWAY_KEEPALIVE_INTERVAL":  "2s",
		"GATEWAY_STRIP_CACHE_CONTROL": "true",
		"GATEWAY_BETA_ALLOWLIST":      "interleaved-thinking-2025-05-14, context-1m-2025-08-07",
		"OAUTH_SCOPES":                "models.invoke models.read",
		"OAUTH_RESOURCE":              "api://fm-gateway",
		"OAUTH_AUDIENCE":              "fm-gateway",
	}))
	require.NoError(t, err)

	assert.Equal(t, "127.0.0.1:9000", cfg.ListenAddr)
	assert.Equal(t, map[string]string{
		"claude-opus-4-7":   "claude-4.7-opus",
		"claude-sonnet-4-5": "claude-4.5-sonnet",
	}, cfg.ModelMap)
	assert.Equal(t, 90*time.Second, cfg.Timeout)
	assert.Equal(t, StreamingUpstream, cfg.StreamingMode)
	assert.Equal(t, 2*time.Second, cfg.KeepaliveInterval)
	assert.True(t, cfg.StripCacheControl)
	assert.Equal(t, []string{"interleaved-thinking-2025-05-14", "context-1m-2025-08-07"}, cfg.BetaAllowlist)
	assert.Equal(t, []string{"models.invoke", "models.read"}, cfg.OAuth.Scopes)
	assert.Equal(t, "api://fm-gateway", cfg.OAuth.Resource)
	assert.Equal(t, "fm-gateway", cfg.OAuth.Audience)
}

func TestLoadErrors(t *testing.T) {
	cases := map[string]struct {
		env     map[string]string
		wantErr string
	}{
		"missing required": {
			env:     map[string]string{"PROXY_API_KEY": "", "OAUTH_CLIENT_SECRET": " "},
			wantErr: "missing required environment variables: OAUTH_CLIENT_SECRET, PROXY_API_KEY",
		},
		"relative gateway url": {
			env:     map[string]string{"GATEWAY_URL": "gateway.internal"},
			wantErr: "GATEWAY_URL must be an absolute URL",
		},
		"bad streaming mode": {
			env:     map[string]string{"GATEWAY_STREAMING_MODE": "chunked"},
			wantErr: "GATEWAY_STREAMING_MODE",
		},
		"bad model map": {
			env:     map[string]string{"GATEWAY_MODEL_MAP": "claude-opus-4-7"},
			wantErr: "GATEWAY_MODEL_MAP entry",
		},
		"bad timeout": {
			env:     map[string]string{"GATEWAY_TIMEOUT": "soon"},
			wantErr: "GATEWAY_TIMEOUT",
		},
		"negative timeout": {
			env:     map[string]string{"GATEWAY_TIMEOUT": "-1s"},
			wantErr: "GATEWAY_TIMEOUT must be positive",
		},
		"bad bool": {
			env:     map[string]string{"GATEWAY_STRIP_CACHE_CONTROL": "maybe"},
			wantErr: "GATEWAY_STRIP_CACHE_CONTROL",
		},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := LoadFrom(env(tc.env))
			require.Error(t, err)
			assert.Contains(t, err.Error(), tc.wantErr)
		})
	}
}

func TestResolveModel(t *testing.T) {
	cfg := &Config{ModelMap: map[string]string{"claude-opus-4-7": "claude-4.7-opus"}}
	assert.Equal(t, "claude-4.7-opus", cfg.ResolveModel("claude-opus-4-7"))
	assert.Equal(t, "claude-haiku-4-5", cfg.ResolveModel("claude-haiku-4-5"), "unmapped models pass through")

	cfg.DefaultModelID = "claude-4.7-opus"
	assert.Equal(t, "claude-4.7-opus", cfg.ResolveModel("claude-haiku-4-5"), "default applies to unmapped models")
	assert.Equal(t, "claude-4.7-opus", cfg.ResolveModel(""))
}
