package manifests

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/require"
)

type fakeClock struct{ t time.Time }

func (c *fakeClock) now() time.Time          { return c.t }
func (c *fakeClock) advance(d time.Duration) { c.t = c.t.Add(d) }

func newTestGate() (*rateLimitGate, *fakeClock) {
	clock := &fakeClock{t: time.Date(2026, 10, 29, 12, 0, 0, 0, time.UTC)}
	return &rateLimitGate{now: clock.now}, clock
}

func rateLimited(retryAfter time.Duration) error {
	return &HTTPError{StatusCode: http.StatusTooManyRequests, RetryAfter: retryAfter}
}

func remaining(t *testing.T, g *rateLimitGate) time.Duration {
	t.Helper()
	var backoff *BackoffError
	require.True(t, errors.As(g.check(), &backoff))
	return backoff.Remaining
}

func TestRateLimitGateBacksOffExponentially(t *testing.T) {
	g, clock := newTestGate()
	require.NoError(t, g.check())

	for _, base := range []time.Duration{2 * time.Second, 4 * time.Second, 8 * time.Second} {
		g.observe(rateLimited(0))
		wait := remaining(t, g)
		require.GreaterOrEqual(t, wait, base)
		require.Less(t, wait, base+base/2)
		clock.advance(wait)
		require.NoError(t, g.check())
	}
}

func TestRateLimitGateCapsDelay(t *testing.T) {
	g, clock := newTestGate()
	for range 30 {
		g.observe(rateLimited(0))
		clock.advance(remaining(t, g))
	}

	g.observe(rateLimited(0))
	require.Less(t, remaining(t, g), gateMaxDelay+gateMaxDelay/2)
}

func TestRateLimitGateHonorsRetryAfter(t *testing.T) {
	g, _ := newTestGate()
	g.observe(rateLimited(time.Minute))
	require.GreaterOrEqual(t, remaining(t, g), time.Minute)
}

func TestRateLimitGateIgnoresInFlightFailures(t *testing.T) {
	g, _ := newTestGate()
	g.observe(rateLimited(0))
	first := remaining(t, g)

	for range 10 {
		g.observe(rateLimited(0))
	}
	require.Equal(t, first, remaining(t, g))
	require.Equal(t, 1, g.failures)
}

func TestRateLimitGateResetsOnSuccess(t *testing.T) {
	g, clock := newTestGate()
	g.observe(rateLimited(0))
	clock.advance(remaining(t, g))
	g.observe(rateLimited(0))
	clock.advance(remaining(t, g))
	require.Equal(t, 2, g.failures)

	g.observe(nil)
	require.Equal(t, 0, g.failures)
	g.observe(errors.New("boom"))
	g.observe(&HTTPError{StatusCode: http.StatusBadRequest})
	require.NoError(t, g.check())
}

func TestManifestCacheStopsFetchingWhileRateLimited(t *testing.T) {
	var digestHits atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		digestHits.Add(1)
		w.Header().Set("Retry-After", "1")
		http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
	}))
	t.Cleanup(server.Close)

	tarball := server.URL
	cache := NewCache(time.Hour, "token", server.URL, "")

	_, err := cache.Fetch(&console.ServiceDeploymentForAgent{ID: "svc-1", Tarball: &tarball})
	var httpErr *HTTPError
	require.True(t, errors.As(err, &httpErr))
	require.Equal(t, http.StatusTooManyRequests, httpErr.StatusCode)

	for _, id := range []string{"svc-1", "svc-2", "svc-3"} {
		_, err = cache.Fetch(&console.ServiceDeploymentForAgent{ID: id, Tarball: &tarball})
		var backoff *BackoffError
		require.True(t, errors.As(err, &backoff))
	}
	require.Equal(t, int32(1), digestHits.Load())
}
