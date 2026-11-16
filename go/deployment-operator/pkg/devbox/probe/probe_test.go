package probe

import (
	"strings"
	"testing"
	"time"
)

func TestConfigMapName(t *testing.T) {
	if got := ConfigMapName("platform", 3); got != "devbox-probe-platform-r3" {
		t.Fatalf("got %q", got)
	}
	long := ConfigMapName(strings.Repeat("a", 80), 12)
	if len(long) > 63 || !strings.HasSuffix(long, "-r12") {
		t.Fatalf("long name %q (%d)", long, len(long))
	}
	if long == ConfigMapName(strings.Repeat("a", 81), 12) {
		t.Fatal("truncated names must stay unique")
	}
}

func TestClaimRoundTrip(t *testing.T) {
	at := time.Date(2026, 11, 14, 5, 0, 0, 0, time.UTC)
	holder, got, ok := ParseClaim(Claim("devbox-gateway-7d9f-abc", at))
	if !ok || holder != "devbox-gateway-7d9f-abc" || !got.Equal(at) {
		t.Fatalf("got %q %v %v", holder, got, ok)
	}
	for _, bad := range []string{"", "gw", "gw not-a-time"} {
		if _, _, ok := ParseClaim(bad); ok {
			t.Errorf("%q should not parse", bad)
		}
	}
}
