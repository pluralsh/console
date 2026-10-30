package manifests

import (
	"fmt"
	"time"
)

type HTTPError struct {
	StatusCode int
	URL        string
	Msg        string
	// RetryAfter is the delay requested by the server's Retry-After header, zero if it sent none.
	RetryAfter time.Duration
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("HTTP %d: %s (url: %s)", e.StatusCode, e.Msg, e.URL)
}

// BackoffError is returned without contacting the console while a previous rate limit is still being backed off.
type BackoffError struct {
	Remaining time.Duration
}

func (e *BackoffError) Error() string {
	return fmt.Sprintf("backing off after console rate limit, retrying in %s", e.Remaining.Round(time.Second))
}
