package openai

import (
	"testing"
)

func TestRoundRobinTokenRotator(t *testing.T) {
	tokens := []string{"token1", "token2", "token3"}
	rotator := NewRoundRobinTokenRotator(tokens)

	// Test rotation
	if got := rotator.GetNextToken(); got != "token1" {
		t.Errorf("First token = %s, want token1", got)
	}
	if got := rotator.GetNextToken(); got != "token2" {
		t.Errorf("Second token = %s, want token2", got)
	}
	if got := rotator.GetNextToken(); got != "token3" {
		t.Errorf("Third token = %s, want token3", got)
	}
	// Should wrap around
	if got := rotator.GetNextToken(); got != "token1" {
		t.Errorf("Fourth token = %s, want token1", got)
	}
}
