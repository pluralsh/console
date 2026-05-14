package tokenexchange

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestCache_AccessToken_hitsServerThenCache(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if r.Method != http.MethodPost {
			http.Error(w, "expected POST", http.StatusMethodNotAllowed)
			return
		}
		_ = r.ParseForm()
		if r.FormValue("grant_type") != "client_credentials" {
			http.Error(w, "bad grant_type", http.StatusBadRequest)
			return
		}
		if r.FormValue("client_id") != "id" || r.FormValue("client_secret") != "secret" {
			http.Error(w, "bad client auth", http.StatusUnauthorized)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"access_token":"tok-one","expires_in":3600}`))
	}))
	t.Cleanup(srv.Close)

	cache := NewCacheWithHTTPClient(srv.Client())
	ctx := context.Background()

	tok1, err := cache.AccessToken(ctx, srv.URL+"/oauth/token", "id", "secret")
	require.NoError(t, err)
	require.Equal(t, "tok-one", tok1)
	afterFirst := calls.Load()
	require.GreaterOrEqual(t, afterFirst, int32(1))

	tok2, err := cache.AccessToken(ctx, srv.URL+"/oauth/token", "id", "secret")
	require.NoError(t, err)
	require.Equal(t, "tok-one", tok2)
	require.Equal(t, afterFirst, calls.Load(), "second lookup should be served from cache without new token HTTP calls")
}

func TestCache_AccessToken_defaultTTLWhenNoExpiry(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"access_token":"bare"}`))
	}))
	t.Cleanup(srv.Close)

	cache := NewCacheWithHTTPClient(srv.Client())
	ctx := context.Background()

	_, err := cache.AccessToken(ctx, srv.URL+"/t", "a", "b")
	require.NoError(t, err)

	cache.mu.Lock()
	ent := cache.entries[cacheKey(srv.URL+"/t", "a", "b")]
	cache.mu.Unlock()
	require.NotNil(t, ent)
	require.True(t, time.Until(ent.expiresAt) > 14*time.Minute)
	require.True(t, time.Until(ent.expiresAt) <= 15*time.Minute)
}

func TestCache_AccessToken_validation(t *testing.T) {
	cache := NewCache()
	_, err := cache.AccessToken(context.Background(), "not-a-url", "x", "y")
	require.Error(t, err)

	_, err = cache.AccessToken(context.Background(), "/relative", "x", "y")
	require.Error(t, err)

	_, err = cache.AccessToken(context.Background(), "https://example.com/token", "", "y")
	require.Error(t, err)
}
