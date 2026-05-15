// Package tokenexchange performs OAuth2 client-credentials exchanges with in-process caching,
// matching Console's Console.AI.Provider.TokenExchange behavior.
package tokenexchange

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/clientcredentials"
	"golang.org/x/sync/singleflight"
)

const defaultTTL = 15 * time.Minute

// Cache stores access tokens keyed by token URL and client credentials, with TTL derived from
// oauth2.Token.Expiry when present (otherwise defaultTTL, as in the Elixir implementation).
type Cache struct {
	httpClient *http.Client
	mu         sync.Mutex
	entries    map[string]*cachedToken
	group      singleflight.Group
}

type cachedToken struct {
	value     string
	expiresAt time.Time
}

// NewCache builds a token cache that uses http.DefaultClient for outbound token requests.
func NewCache() *Cache {
	return NewCacheWithHTTPClient(http.DefaultClient)
}

// NewCacheWithHTTPClient builds a token cache with a custom HTTP client (timeouts, tracing, etc.).
func NewCacheWithHTTPClient(httpClient *http.Client) *Cache {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &Cache{
		httpClient: httpClient,
		entries:    make(map[string]*cachedToken),
	}
}

// AccessToken returns a valid access token, using the cache when the entry is still fresh.
func (c *Cache) AccessToken(ctx context.Context, tokenURL, clientID, clientSecret string) (string, error) {
	if err := validateTokenURL(tokenURL); err != nil {
		return "", err
	}
	if clientID == "" || clientSecret == "" {
		return "", fmt.Errorf("clientId and clientSecret must be non-empty")
	}

	key := cacheKey(tokenURL, clientID, clientSecret)

	c.mu.Lock()
	if ent := c.entries[key]; ent != nil && time.Now().Before(ent.expiresAt) {
		out := ent.value
		c.mu.Unlock()
		return out, nil
	}
	c.mu.Unlock()

	v, err, _ := c.group.Do(key, func() (interface{}, error) {
		c.mu.Lock()
		if ent := c.entries[key]; ent != nil && time.Now().Before(ent.expiresAt) {
			out := ent.value
			c.mu.Unlock()
			return out, nil
		}
		c.mu.Unlock()

		reqCtx := ctx
		if c.httpClient != nil {
			reqCtx = context.WithValue(reqCtx, oauth2.HTTPClient, c.httpClient)
		}

		cc := &clientcredentials.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			TokenURL:     tokenURL,
		}
		tok, err := cc.Token(reqCtx)
		if err != nil {
			return "", fmt.Errorf("token request failed: %w", err)
		}
		if tok.AccessToken == "" {
			return "", fmt.Errorf("token response missing access_token")
		}

		ttl := cacheTTL(tok)
		c.mu.Lock()
		c.entries[key] = &cachedToken{
			value:     tok.AccessToken,
			expiresAt: time.Now().Add(ttl),
		}
		c.mu.Unlock()

		return tok.AccessToken, nil
	})
	if err != nil {
		return "", err
	}
	s, _ := v.(string)
	return s, nil
}

func cacheKey(tokenURL, clientID, clientSecret string) string {
	return tokenURL + "\x00" + clientID + "\x00" + clientSecret
}

func validateTokenURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid tokenUrl: %w", err)
	}
	if u.Scheme == "" || u.Host == "" {
		return fmt.Errorf("tokenUrl must be an absolute URL with scheme and host")
	}
	return nil
}

func cacheTTL(tok *oauth2.Token) time.Duration {
	if tok == nil {
		return defaultTTL
	}
	if tok.Expiry.IsZero() {
		return defaultTTL
	}
	ttl := time.Until(tok.Expiry)
	if ttl <= 0 {
		return defaultTTL
	}
	return ttl
}
