package ratelimit

import "testing"

func TestIPLimiterAllow(t *testing.T) {
	limiter := NewIPLimiter(1, 1)
	if !limiter.Allow("1.2.3.4") {
		t.Fatalf("first request should pass")
	}
	if limiter.Allow("1.2.3.4") {
		t.Fatalf("second immediate request should be limited")
	}
	if !limiter.Allow("5.6.7.8") {
		t.Fatalf("independent ip should pass")
	}
}
