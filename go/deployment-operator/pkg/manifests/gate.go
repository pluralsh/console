package manifests

import (
	"errors"
	"net/http"
	"sync"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
)

const (
	gateBaseDelay = 2 * time.Second
	gateMaxDelay  = 5 * time.Minute
)

// rateLimitGate pauses every manifest fetch from this agent once the console rate limits any of them. The console's
// limiters are shared across all services and clusters, so retrying each service on its own only prolongs the storm.
type rateLimitGate struct {
	mu       sync.Mutex
	until    time.Time
	failures int
	now      func() time.Time
}

func newRateLimitGate() *rateLimitGate {
	return &rateLimitGate{now: time.Now}
}

func (g *rateLimitGate) check() error {
	g.mu.Lock()
	defer g.mu.Unlock()

	if remaining := g.until.Sub(g.now()); remaining > 0 {
		return &BackoffError{Remaining: remaining}
	}
	return nil
}

func (g *rateLimitGate) observe(err error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	if err == nil {
		g.failures = 0
		return
	}

	var httpErr *HTTPError
	if !errors.As(err, &httpErr) || httpErr.StatusCode != http.StatusTooManyRequests {
		return
	}

	now := g.now()
	// requests already in flight when the gate closed shouldn't compound the backoff
	if now.Before(g.until) {
		return
	}

	g.failures++
	delay := min(gateBaseDelay<<min(g.failures-1, 16), gateMaxDelay)
	delay = max(delay, httpErr.RetryAfter)
	g.until = now.Add(delay + utils.Jitter(delay/2))
}
