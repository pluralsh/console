// Package config loads gateway-proxy settings from environment variables.
package config

import (
	"fmt"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

type StreamingMode string

const (
	// StreamingSynthesize calls the non-streaming invoke endpoint and replays the full response
	// to the client as Anthropic SSE events.
	StreamingSynthesize StreamingMode = "synthesize"
	// StreamingUpstream calls /model/{id}/invoke-with-response-stream and converts the
	// AWS event-stream chunks into Anthropic SSE events as they arrive.
	StreamingUpstream StreamingMode = "upstream"
)

type Config struct {
	// ListenAddr is the address the proxy serves on (PROXY_LISTEN_ADDR, default ":8080").
	ListenAddr string
	// APIKey is the key clients must present via x-api-key or Authorization: Bearer (PROXY_API_KEY).
	APIKey string

	// GatewayURL is the FM gateway base URL; requests go to {GatewayURL}/model/{id}/invoke (GATEWAY_URL).
	GatewayURL string
	// DefaultModelID is used when the client's model has no entry in ModelMap (GATEWAY_MODEL_ID).
	// When empty, the client's model is passed through unchanged.
	DefaultModelID string
	// ModelMap maps Anthropic model names to gateway model IDs (GATEWAY_MODEL_MAP, "a=b,c=d").
	ModelMap map[string]string
	// Timeout bounds a single upstream call, sent as Request-Timeout-Ms (GATEWAY_TIMEOUT, default 10m).
	Timeout time.Duration
	// StreamingMode selects how stream=true requests are served (GATEWAY_STREAMING_MODE).
	StreamingMode StreamingMode
	// KeepaliveInterval is how long a synthesized stream waits on the upstream before committing
	// a 200 and emitting ping events (GATEWAY_KEEPALIVE_INTERVAL, default 10s).
	KeepaliveInterval time.Duration
	// StripCacheControl removes cache_control from system, message content and tools
	// (GATEWAY_STRIP_CACHE_CONTROL).
	StripCacheControl bool
	// BetaAllowlist limits which anthropic-beta values are forwarded; empty forwards all
	// (GATEWAY_BETA_ALLOWLIST, comma separated).
	BetaAllowlist []string

	OAuth OAuth
}

type OAuth struct {
	TokenURL     string   // OAUTH_TOKEN_URL
	ClientID     string   // OAUTH_CLIENT_ID
	ClientSecret string   // OAUTH_CLIENT_SECRET
	Scopes       []string // OAUTH_SCOPES, space or comma separated
	Resource     string   // OAUTH_RESOURCE
	Audience     string   // OAUTH_AUDIENCE
}

// Load reads the configuration from the process environment.
func Load() (*Config, error) {
	return LoadFrom(os.LookupEnv)
}

// LoadFrom reads the configuration using the given lookup function.
func LoadFrom(lookup func(string) (string, bool)) (*Config, error) {
	get := func(key, def string) string {
		if v, ok := lookup(key); ok && strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
		return def
	}

	cfg := &Config{
		ListenAddr:     get("PROXY_LISTEN_ADDR", ":8080"),
		APIKey:         get("PROXY_API_KEY", ""),
		GatewayURL:     strings.TrimRight(get("GATEWAY_URL", ""), "/"),
		DefaultModelID: get("GATEWAY_MODEL_ID", ""),
		StreamingMode:  StreamingMode(strings.ToLower(get("GATEWAY_STREAMING_MODE", string(StreamingSynthesize)))),
		BetaAllowlist:  splitList(get("GATEWAY_BETA_ALLOWLIST", "")),
		OAuth: OAuth{
			TokenURL:     get("OAUTH_TOKEN_URL", ""),
			ClientID:     get("OAUTH_CLIENT_ID", ""),
			ClientSecret: get("OAUTH_CLIENT_SECRET", ""),
			Scopes:       splitList(get("OAUTH_SCOPES", "")),
			Resource:     get("OAUTH_RESOURCE", ""),
			Audience:     get("OAUTH_AUDIENCE", ""),
		},
	}

	var err error
	if cfg.ModelMap, err = parseModelMap(get("GATEWAY_MODEL_MAP", "")); err != nil {
		return nil, err
	}
	if cfg.Timeout, err = parseDuration("GATEWAY_TIMEOUT", get("GATEWAY_TIMEOUT", "10m")); err != nil {
		return nil, err
	}
	if cfg.KeepaliveInterval, err = parseDuration("GATEWAY_KEEPALIVE_INTERVAL", get("GATEWAY_KEEPALIVE_INTERVAL", "10s")); err != nil {
		return nil, err
	}
	if cfg.StripCacheControl, err = parseBool("GATEWAY_STRIP_CACHE_CONTROL", get("GATEWAY_STRIP_CACHE_CONTROL", "false")); err != nil {
		return nil, err
	}

	return cfg, cfg.Validate()
}

func (c *Config) Validate() error {
	var missing []string
	for key, val := range map[string]string{
		"PROXY_API_KEY":       c.APIKey,
		"GATEWAY_URL":         c.GatewayURL,
		"OAUTH_TOKEN_URL":     c.OAuth.TokenURL,
		"OAUTH_CLIENT_ID":     c.OAuth.ClientID,
		"OAUTH_CLIENT_SECRET": c.OAuth.ClientSecret,
	} {
		if val == "" {
			missing = append(missing, key)
		}
	}
	if len(missing) > 0 {
		sort.Strings(missing)
		return fmt.Errorf("missing required environment variables: %s", strings.Join(missing, ", "))
	}

	for key, raw := range map[string]string{"GATEWAY_URL": c.GatewayURL, "OAUTH_TOKEN_URL": c.OAuth.TokenURL} {
		u, err := url.Parse(raw)
		if err != nil || u.Scheme == "" || u.Host == "" {
			return fmt.Errorf("%s must be an absolute URL, got %q", key, raw)
		}
	}

	switch c.StreamingMode {
	case StreamingSynthesize, StreamingUpstream:
	default:
		return fmt.Errorf("GATEWAY_STREAMING_MODE must be %q or %q, got %q", StreamingSynthesize, StreamingUpstream, c.StreamingMode)
	}

	if c.Timeout <= 0 {
		return fmt.Errorf("GATEWAY_TIMEOUT must be positive")
	}
	if c.KeepaliveInterval <= 0 {
		return fmt.Errorf("GATEWAY_KEEPALIVE_INTERVAL must be positive")
	}
	return nil
}

// ResolveModel maps an Anthropic model name to the gateway model ID.
func (c *Config) ResolveModel(model string) string {
	if id, ok := c.ModelMap[model]; ok {
		return id
	}
	if c.DefaultModelID != "" {
		return c.DefaultModelID
	}
	return model
}

func parseModelMap(raw string) (map[string]string, error) {
	out := map[string]string{}
	for _, pair := range strings.Split(raw, ",") {
		pair = strings.TrimSpace(pair)
		if pair == "" {
			continue
		}
		from, to, ok := strings.Cut(pair, "=")
		from, to = strings.TrimSpace(from), strings.TrimSpace(to)
		if !ok || from == "" || to == "" {
			return nil, fmt.Errorf("GATEWAY_MODEL_MAP entry %q must look like anthropic-model=gateway-model", pair)
		}
		out[from] = to
	}
	return out, nil
}

func parseDuration(key, raw string) (time.Duration, error) {
	d, err := time.ParseDuration(raw)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return d, nil
}

func parseBool(key, raw string) (bool, error) {
	b, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("%s: %w", key, err)
	}
	return b, nil
}

func splitList(raw string) []string {
	fields := strings.FieldsFunc(raw, func(r rune) bool { return r == ',' || r == ' ' })
	if len(fields) == 0 {
		return nil
	}
	return fields
}
