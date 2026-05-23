package v1

import "testing"

func TestExaConnectionEnabled(t *testing.T) {
	run := &AgentRun{Runtime: &AgentRuntime{ExaConnection: true}}
	if !run.ExaConnectionEnabled() {
		t.Fatal("expected exa connection to be enabled")
	}

	disabled := &AgentRun{Runtime: &AgentRuntime{}}
	if disabled.ExaConnectionEnabled() {
		t.Fatal("expected exa connection to be disabled")
	}
}
