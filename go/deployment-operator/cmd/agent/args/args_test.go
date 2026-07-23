package args

import (
	"testing"
	"time"
)

func TestWorkqueueBaseDelayDefault(t *testing.T) {
	if got := WorkqueueBaseDelay(); got != time.Second {
		t.Fatalf("expected default workqueue base delay to be 1s, got %s", got)
	}
}
