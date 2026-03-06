package httpz

import (
	"context"
	"net/http"
)

var (
	_ http.RoundTripper = &RateLimitingRoundTripper{}
)

// Limiter defines the interface to perform client-side request rate limiting.
// You can use golang.org/x/time/rate.Limiter as an implementation of this interface.
type Limiter interface {
	// Wait blocks until limiter permits an event to happen.
	// It returns an error if the Context is
	// canceled, or the expected wait time exceeds the Context's Deadline.
	Wait(context.Context) error
}

type RateLimitingRoundTripper struct {
	Delegate http.RoundTripper
	Limiter  Limiter
}

func (r *RateLimitingRoundTripper) RoundTrip(request *http.Request) (*http.Response, error) {
	if err := r.Limiter.Wait(request.Context()); err != nil {
		return nil, err
	}
	return r.Delegate.RoundTrip(request)
}
