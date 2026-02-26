package mathz

import (
	"math/rand"
	"sync"
	"time"
)

var (
	r  = rand.New(rand.NewSource(time.Now().UnixNano())) // nolint:gosec
	mu sync.Mutex
)

func Int63n(n int64) int64 {
	mu.Lock()
	defer mu.Unlock()
	return r.Int63n(n)
}

func Int63() int64 {
	mu.Lock()
	defer mu.Unlock()
	return r.Int63()
}

// DurationWithPositiveJitter returns d with an added jitter in the range [0,jitterPercent% of the value) i.e. it's additive.
func DurationWithPositiveJitter(d time.Duration, jitterPercent int64) time.Duration {
	r := (int64(d) * jitterPercent) / 100
	jitter := Int63n(r)
	return d + time.Duration(jitter)
}
