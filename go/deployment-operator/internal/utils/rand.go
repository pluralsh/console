package utils

import (
	"math/rand"
	"time"
)

func Jitter(interval time.Duration) time.Duration {
	jittered := int64(float64(int64(interval)) * rand.Float64())
	return time.Duration(jittered)
}

// WithJitterFactor adds random jitter up to factor of interval in either direction.
// Factor must be in the range [0, 1]; zero leaves the interval unchanged.
func WithJitterFactor(interval time.Duration, factor float64) time.Duration {
	if interval <= 0 || factor <= 0 || factor > 1 {
		return interval
	}

	maxJitter := int64(float64(interval) * factor)
	if maxJitter <= 0 {
		return interval
	}

	jitter := time.Duration(rand.Int63n(maxJitter*2) - maxJitter)
	return interval + jitter
}
