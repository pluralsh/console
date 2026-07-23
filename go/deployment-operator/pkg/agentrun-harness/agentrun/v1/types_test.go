package v1

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
)

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

func TestFromAgentRunFragmentCopiesSkills(t *testing.T) {
	description := "Helps update README files"
	run := new(AgentRun).FromAgentRunFragment(&console.AgentRunFragment{
		ID:         "run-123",
		Prompt:     "update the readme",
		Repository: "https://github.com/pluralsh/console.git",
		Mode:       console.AgentRunModeWrite,
		Status:     console.AgentRunStatusPending,
		Skills: []*console.AgentRunFragment_Skills{
			{
				Name:        "readme-helper",
				Description: &description,
				Contents:    "Always keep examples runnable.",
			},
			nil,
		},
	})

	if len(run.Skills) != 1 {
		t.Fatalf("expected one skill, got %d", len(run.Skills))
	}
	if run.Skills[0].Name != "readme-helper" {
		t.Fatalf("expected skill name copied, got %q", run.Skills[0].Name)
	}
	if run.Skills[0].Description == nil || *run.Skills[0].Description != description {
		t.Fatalf("expected skill description copied, got %#v", run.Skills[0].Description)
	}
	if run.Skills[0].Contents != "Always keep examples runnable." {
		t.Fatalf("expected skill contents copied, got %q", run.Skills[0].Contents)
	}
}

func TestFromAgentRunFragmentCopiesUsage(t *testing.T) {
	inputTokens := int64(10)
	outputTokens := int64(5)
	totalCost := 0.25
	run := new(AgentRun).FromAgentRunFragment(&console.AgentRunFragment{
		ID:         "run-123",
		Prompt:     "update the readme",
		Repository: "https://github.com/pluralsh/console.git",
		Mode:       console.AgentRunModeWrite,
		Status:     console.AgentRunStatusPending,
		Usage: &console.AgentRunFragment_Usage{
			InputTokens:  &inputTokens,
			OutputTokens: &outputTokens,
			TotalCost:    &totalCost,
		},
	})

	if run.Usage == nil {
		t.Fatal("expected usage to be copied")
	}
	if run.Usage.InputTokens == nil || *run.Usage.InputTokens != inputTokens {
		t.Fatalf("expected input tokens copied, got %#v", run.Usage.InputTokens)
	}
	if run.Usage.OutputTokens == nil || *run.Usage.OutputTokens != outputTokens {
		t.Fatalf("expected output tokens copied, got %#v", run.Usage.OutputTokens)
	}
	if run.Usage.TotalCost == nil || *run.Usage.TotalCost != totalCost {
		t.Fatalf("expected total cost copied, got %#v", run.Usage.TotalCost)
	}
}
