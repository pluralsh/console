// Package oauth exchanges OAuth2 client credentials for access tokens and caches them until they
// expire, mirroring Console.AI.Provider.TokenExchange and nexus' tokenexchange cache.
package oauth

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/clientcredentials"
	"golang.org/x/sync/singleflight"
)

const (
	// DefaultTTL is used when the token response carries no expires_in.
	DefaultTTL = 15 * time.Minute
	// DefaultRefreshMargin refreshes tokens this long before they actually expire so that a
	// request never leaves the proxy with a token that dies in flight.
	DefaultRefreshMargin = 30 * time.Second
)

type Credentials struct {
	TokenURL     string
	ClientID     string
	ClientSecret string
	Scopes       []string
	Resource     string
	Audience     string
}

type Option func(*Cache)

func WithHTTPClient(c *http.Client) Option {
	return func(cache *Cache) {
		if c != nil {
			cache.httpClient = c
		}
	}
}

func WithClock(now func() time.Time) Option {
	return func(cache *Cache) { cache.now = now }
}

func WithRefreshMargin(d time.Duration) Option {
	return func(cache *Cache) { cache.margin = d }
}

// Cache hands out a cached access token for a single set of client credentials.
type Cache struct {
	creds      Credentials
	httpClient *http.Client
	now        func() time.Time
	margin     time.Duration

	mu        sync.Mutex
	token     string
	expiresAt time.Time
	group     singleflight.Group
}

func NewCache(creds Credentials, opts ...Option) (*Cache, error) {
	u, err := url.Parse(creds.TokenURL)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return nil, fmt.Errorf("token URL must be an absolute URL with scheme and host")
	}
	if creds.ClientID == "" || creds.ClientSecret == "" {
		return nil, fmt.Errorf("client ID and client secret must be non-empty")
	}

	c := &Cache{
		creds:      creds,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		now:        time.Now,
		margin:     DefaultRefreshMargin,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c, nil
}

// Token returns a cached access token, fetching a new one if the cached token is missing or
// within the refresh margin of its expiry. Concurrent callers share a single token request.
func (c *Cache) Token(ctx context.Context) (string, error) {
	if tok, ok := c.cached(); ok {
		return tok, nil
	}

	v, err, _ := c.group.Do("token", func() (interface{}, error) {
		if tok, ok := c.cached(); ok {
			return tok, nil
		}
		return c.fetch(context.WithoutCancel(ctx))
	})
	if err != nil {
		return "", err
	}
	return v.(string), nil
}

// Invalidate drops the cached token if it is still the given value, so that a token the
// upstream rejected is not reused while a concurrently refreshed one is kept.
func (c *Cache) Invalidate(token string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.token == token {
		c.token = ""
		c.expiresAt = time.Time{}
	}
}

func (c *Cache) cached() (string, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.token != "" && c.now().Before(c.expiresAt) {
		return c.token, true
	}
	return "", false
}

func (c *Cache) fetch(ctx context.Context) (string, error) {
	params := url.Values{}
	if c.creds.Resource != "" {
		params.Set("resource", c.creds.Resource)
	}
	if c.creds.Audience != "" {
		params.Set("audience", c.creds.Audience)
	}

	cc := &clientcredentials.Config{
		ClientID:       c.creds.ClientID,
		ClientSecret:   c.creds.ClientSecret,
		TokenURL:       c.creds.TokenURL,
		Scopes:         c.creds.Scopes,
		EndpointParams: params,
	}

	requested, wallRequested := c.now(), time.Now()
	tok, err := cc.Token(context.WithValue(ctx, oauth2.HTTPClient, c.httpClient))
	if err != nil {
		return "", fmt.Errorf("token request failed: %w", err)
	}
	if tok.AccessToken == "" {
		return "", fmt.Errorf("token response missing access_token")
	}

	expiresAt := requested.Add(DefaultTTL)
	if lifetime := tokenLifetime(tok, wallRequested); lifetime > 0 {
		expiresAt = requested.Add(lifetime - min(c.margin, lifetime/2))
	}

	c.mu.Lock()
	c.token = tok.AccessToken
	c.expiresAt = expiresAt
	c.mu.Unlock()

	return tok.AccessToken, nil
}

// tokenLifetime returns how long the token is valid for, preferring the raw expires_in (which
// some providers send as a string) over the wall-clock Expiry computed by x/oauth2.
func tokenLifetime(tok *oauth2.Token, wallRequested time.Time) time.Duration {
	if tok.ExpiresIn > 0 {
		return time.Duration(tok.ExpiresIn) * time.Second
	}
	switch v := tok.Extra("expires_in").(type) {
	case float64:
		if v > 0 {
			return time.Duration(v * float64(time.Second))
		}
	case string:
		if secs, err := strconv.ParseInt(v, 10, 64); err == nil && secs > 0 {
			return time.Duration(secs) * time.Second
		}
	}
	if !tok.Expiry.IsZero() && tok.Expiry.After(wallRequested) {
		return tok.Expiry.Sub(wallRequested)
	}
	return 0
}
