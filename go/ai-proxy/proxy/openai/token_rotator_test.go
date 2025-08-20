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

	// Test remove token
	rotator.RemoveToken("token2")
	// After removal, index resets to 0, so we start with token1
	got := rotator.GetNextToken()
	if got != "token1" {
		t.Errorf("After remove token2, got %s, want token1", got)
	}
	got = rotator.GetNextToken()
	if got != "token3" {
		t.Errorf("After remove token2, got %s, want token3", got)
	}

	// Test add token
	rotator.AddToken("token4")
	seen := make(map[string]bool)
	for i := 0; i < 4; i++ {
		seen[rotator.GetNextToken()] = true
	}
	expected := map[string]bool{
		"token1": true,
		"token3": true,
		"token4": true,
	}
	for token := range expected {
		if !seen[token] {
			t.Errorf("After adding token4, missing token %s in rotation", token)
		}
	}
	if seen["token2"] {
		t.Error("Removed token2 still appearing in rotation")
	}
}
