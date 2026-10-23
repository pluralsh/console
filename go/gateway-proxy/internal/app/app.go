// Package app wires configuration into a ready-to-serve gateway-proxy handler.
package app

import (
	"log/slog"
	"net/http"

	"github.com/pluralsh/console/go/gateway-proxy/internal/config"
	"github.com/pluralsh/console/go/gateway-proxy/internal/oauth"
	"github.com/pluralsh/console/go/gateway-proxy/internal/proxy"
)

// NewHandler builds the proxy handler. A nil httpClient uses http.DefaultTransport for both the
// token endpoint and the gateway.
func NewHandler(cfg *config.Config, httpClient *http.Client, logger *slog.Logger) (http.Handler, error) {
	if httpClient == nil {
		httpClient = &http.Client{Transport: http.DefaultTransport}
	}

	tokens, err := oauth.NewCache(oauth.Credentials{
		TokenURL:     cfg.OAuth.TokenURL,
		ClientID:     cfg.OAuth.ClientID,
		ClientSecret: cfg.OAuth.ClientSecret,
		Scopes:       cfg.OAuth.Scopes,
		Resource:     cfg.OAuth.Resource,
		Audience:     cfg.OAuth.Audience,
	}, oauth.WithHTTPClient(httpClient))
	if err != nil {
		return nil, err
	}

	return proxy.NewHandler(proxy.Options{
		APIKey: cfg.APIKey,
		Gateway: &proxy.Gateway{
			BaseURL: cfg.GatewayURL,
			Tokens:  tokens,
			Client:  httpClient,
			Timeout: cfg.Timeout,
		},
		Request: proxy.RequestOptions{
			ResolveModel:      cfg.ResolveModel,
			StripCacheControl: cfg.StripCacheControl,
			BetaAllowlist:     cfg.BetaAllowlist,
		},
		UpstreamStreaming: cfg.StreamingMode == config.StreamingUpstream,
		KeepaliveInterval: cfg.KeepaliveInterval,
		Timeout:           cfg.Timeout,
		Logger:            logger,
	}), nil
}
