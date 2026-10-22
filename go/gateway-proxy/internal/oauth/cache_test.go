package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type tokenServer struct {
	*httptest.Server
	calls     atomic.Int64
	expiresIn any
	delay     time.Duration
	status    int
	lastForm  url.Values
	mu        sync.Mutex
}

func newTokenServer(t *testing.T) *tokenServer {
	ts := &tokenServer{expiresIn: 120, status: http.StatusOK}
	ts.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.NoError(t, r.ParseForm())
		id, secret, ok := r.BasicAuth()
		if !ok {
			id, secret = r.PostForm.Get("client_id"), r.PostForm.Get("client_secret")
		}

		ts.mu.Lock()
		ts.lastForm = r.PostForm
		delay, status, expiresIn := ts.delay, ts.status, ts.expiresIn
		ts.mu.Unlock()

		if delay > 0 {
			time.Sleep(delay)
		}
		w.Header().Set("Content-Type", "application/json")
		if status != http.StatusOK || id != "client" || secret != "secret" {
			w.WriteHeader(max(status, http.StatusUnauthorized))
			_, _ = w.Write([]byte(`{"error":"invalid_client"}`))
			return
		}

		n := ts.calls.Add(1)
		body := map[string]any{"access_token": fmt.Sprintf("tok-%d", n), "token_type": "Bearer"}
		if expiresIn != nil {
			body["expires_in"] = expiresIn
		}
		_ = json.NewEncoder(w).Encode(body)
	}))
	t.Cleanup(ts.Close)
	return ts
}

func (ts *tokenServer) set(fn func(*tokenServer)) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	fn(ts)
}

type fakeClock struct {
	mu  sync.Mutex
	now time.Time
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *fakeClock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.now = c.now.Add(d)
}

func newCache(t *testing.T, ts *tokenServer, clock *fakeClock, creds ...func(*Credentials)) *Cache {
	c := Credentials{TokenURL: ts.URL, ClientID: "client", ClientSecret: "secret"}
	for _, fn := range creds {
		fn(&c)
	}
	opts := []Option{WithHTTPClient(ts.Client())}
	if clock != nil {
		opts = append(opts, WithClock(clock.Now))
	}
	cache, err := NewCache(c, opts...)
	require.NoError(t, err)
	return cache
}

func TestNewCacheValidation(t *testing.T) {
	_, err := NewCache(Credentials{TokenURL: "/oauth/token", ClientID: "a", ClientSecret: "b"})
	assert.ErrorContains(t, err, "absolute URL")

	_, err = NewCache(Credentials{TokenURL: "https://idp/oauth/token", ClientID: "a"})
	assert.ErrorContains(t, err, "non-empty")
}

func TestTokenIsCachedUntilRefreshMargin(t *testing.T) {
	ts := newTokenServer(t)
	clock := &fakeClock{now: time.Unix(1_700_000_000, 0)}
	cache := newCache(t, ts, clock)
	ctx := context.Background()

	tok, err := cache.Token(ctx)
	require.NoError(t, err)
	assert.Equal(t, "tok-1", tok)

	// expires_in=120 with a 30s margin: the token is reused for 90s.
	clock.Advance(89 * time.Second)
	tok, err = cache.Token(ctx)
	require.NoError(t, err)
	assert.Equal(t, "tok-1", tok)
	assert.EqualValues(t, 1, ts.calls.Load())

	clock.Advance(2 * time.Second)
	tok, err = cache.Token(ctx)
	require.NoError(t, err)
	assert.Equal(t, "tok-2", tok)
	assert.EqualValues(t, 2, ts.calls.Load())
}

func TestShortLivedTokenMarginIsCapped(t *testing.T) {
	ts := newTokenServer(t)
	ts.set(func(s *tokenServer) { s.expiresIn = 20 })
	clock := &fakeClock{now: time.Unix(1_700_000_000, 0)}
	cache := newCache(t, ts, clock)

	_, err := cache.Token(context.Background())
	require.NoError(t, err)

	// A 30s margin on a 20s token would never cache; the margin is capped at half the lifetime.
	clock.Advance(9 * time.Second)
	tok, _ := cache.Token(context.Background())
	assert.Equal(t, "tok-1", tok)

	clock.Advance(2 * time.Second)
	tok, _ = cache.Token(context.Background())
	assert.Equal(t, "tok-2", tok)
}

func TestStringExpiresIn(t *testing.T) {
	ts := newTokenServer(t)
	ts.set(func(s *tokenServer) { s.expiresIn = "3600" })
	clock := &fakeClock{now: time.Unix(1_700_000_000, 0)}
	cache := newCache(t, ts, clock)

	_, err := cache.Token(context.Background())
	require.NoError(t, err)
	clock.Advance(59 * time.Minute)
	tok, _ := cache.Token(context.Background())
	assert.Equal(t, "tok-1", tok)

	clock.Advance(40 * time.Second)
	tok, _ = cache.Token(context.Background())
	assert.Equal(t, "tok-2", tok)
}

func TestFormEncodedTokenResponse(t *testing.T) {
	var calls atomic.Int64
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := calls.Add(1)
		w.Header().Set("Content-Type", "application/x-www-form-urlencoded")
		_, _ = fmt.Fprintf(w, "access_token=form-%d&token_type=bearer&expires_in=600", n)
	}))
	t.Cleanup(ts.Close)

	clock := &fakeClock{now: time.Unix(1_700_000_000, 0)}
	cache, err := NewCache(Credentials{TokenURL: ts.URL, ClientID: "client", ClientSecret: "secret"},
		WithHTTPClient(ts.Client()), WithClock(clock.Now))
	require.NoError(t, err)

	tok, err := cache.Token(context.Background())
	require.NoError(t, err)
	assert.Equal(t, "form-1", tok)

	clock.Advance(9 * time.Minute)
	tok, _ = cache.Token(context.Background())
	assert.Equal(t, "form-1", tok)

	clock.Advance(time.Minute)
	tok, _ = cache.Token(context.Background())
	assert.Equal(t, "form-2", tok)
}

func TestMissingExpiryUsesDefaultTTL(t *testing.T) {
	ts := newTokenServer(t)
	ts.set(func(s *tokenServer) { s.expiresIn = nil })
	clock := &fakeClock{now: time.Unix(1_700_000_000, 0)}
	cache := newCache(t, ts, clock)

	_, err := cache.Token(context.Background())
	require.NoError(t, err)

	clock.Advance(DefaultTTL - time.Second)
	tok, _ := cache.Token(context.Background())
	assert.Equal(t, "tok-1", tok)

	clock.Advance(2 * time.Second)
	tok, _ = cache.Token(context.Background())
	assert.Equal(t, "tok-2", tok)
}

func TestConcurrentCallersShareOneRequest(t *testing.T) {
	ts := newTokenServer(t)
	ts.set(func(s *tokenServer) { s.delay = 50 * time.Millisecond })
	cache := newCache(t, ts, nil)

	var wg sync.WaitGroup
	tokens := make([]string, 50)
	for i := range tokens {
		wg.Add(1)
		go func() {
			defer wg.Done()
			tok, err := cache.Token(context.Background())
			assert.NoError(t, err)
			tokens[i] = tok
		}()
	}
	wg.Wait()

	assert.EqualValues(t, 1, ts.calls.Load())
	for _, tok := range tokens {
		assert.Equal(t, "tok-1", tok)
	}
}

func TestCanceledCallerDoesNotPoisonSharedFetch(t *testing.T) {
	ts := newTokenServer(t)
	ts.set(func(s *tokenServer) { s.delay = 50 * time.Millisecond })
	cache := newCache(t, ts, nil)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	tok, err := cache.Token(ctx)
	require.NoError(t, err)
	assert.Equal(t, "tok-1", tok)
}

func TestInvalidate(t *testing.T) {
	ts := newTokenServer(t)
	cache := newCache(t, ts, nil)
	ctx := context.Background()

	first, _ := cache.Token(ctx)
	cache.Invalidate("some-older-token")
	tok, _ := cache.Token(ctx)
	assert.Equal(t, first, tok, "invalidating a stale value keeps the current token")

	cache.Invalidate(first)
	tok, _ = cache.Token(ctx)
	assert.Equal(t, "tok-2", tok)
}

func TestTokenEndpointErrorIsNotCached(t *testing.T) {
	ts := newTokenServer(t)
	ts.set(func(s *tokenServer) { s.status = http.StatusInternalServerError })
	cache := newCache(t, ts, nil)

	_, err := cache.Token(context.Background())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "token request failed")

	ts.set(func(s *tokenServer) { s.status = http.StatusOK })
	tok, err := cache.Token(context.Background())
	require.NoError(t, err)
	assert.Equal(t, "tok-1", tok)
}

func TestScopesResourceAndAudienceAreSent(t *testing.T) {
	ts := newTokenServer(t)
	cache := newCache(t, ts, nil, func(c *Credentials) {
		c.Scopes = []string{"models.invoke", "models.read"}
		c.Resource = "api://fm-gateway"
		c.Audience = "fm-gateway"
	})

	_, err := cache.Token(context.Background())
	require.NoError(t, err)

	ts.mu.Lock()
	defer ts.mu.Unlock()
	assert.Equal(t, "client_credentials", ts.lastForm.Get("grant_type"))
	assert.Equal(t, "models.invoke models.read", ts.lastForm.Get("scope"))
	assert.Equal(t, "api://fm-gateway", ts.lastForm.Get("resource"))
	assert.Equal(t, "fm-gateway", ts.lastForm.Get("audience"))
}
