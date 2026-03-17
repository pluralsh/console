package ratelimit

import (
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type bucket struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// IPLimiter enforces per-IP token bucket limits.
type IPLimiter struct {
	mu         sync.Mutex
	buckets    map[string]*bucket
	limit      rate.Limit
	burst      int
	expiresIn  time.Duration
	lastPruned time.Time
}

func NewIPLimiter(rps, burst int) *IPLimiter {
	return &IPLimiter{
		buckets:   make(map[string]*bucket),
		limit:     rate.Limit(rps),
		burst:     burst,
		expiresIn: 15 * time.Minute,
	}
}

func (l *IPLimiter) Allow(ip string) bool {
	now := time.Now()

	l.mu.Lock()
	defer l.mu.Unlock()

	if l.lastPruned.IsZero() || now.Sub(l.lastPruned) > time.Minute {
		l.prune(now)
	}

	entry, ok := l.buckets[ip]
	if !ok {
		entry = &bucket{limiter: rate.NewLimiter(l.limit, l.burst)}
		l.buckets[ip] = entry
	}

	entry.lastSeen = now
	return entry.limiter.Allow()
}

func (l *IPLimiter) prune(now time.Time) {
	for ip, entry := range l.buckets {
		if now.Sub(entry.lastSeen) > l.expiresIn {
			delete(l.buckets, ip)
		}
	}
	l.lastPruned = now
}
