package controller

import (
	"context"
	"testing"

	gqlclient "github.com/pluralsh/console/go/client"

	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
)

func TestLatestPendingPrompt(t *testing.T) {
	prompts := []*gqlclient.AgentPromptFragment{
		{Prompt: "first", Seq: 1},
		{Prompt: "third", Seq: 3},
		{Prompt: "second", Seq: 2},
		nil,
		{Prompt: "   ", Seq: 4},
	}

	got := latestPendingPrompt(prompts)
	if got == nil || got.Prompt != "third" || got.Seq != 3 {
		t.Fatalf("latestPendingPrompt() = %#v, want seq 3", got)
	}
}

func TestApplyFollowupBootPrompt(t *testing.T) {
	in := &agentRunController{
		agentRunID: "run-1",
		agentRun: &agentrunv1.AgentRun{
			Followup: true,
			Prompt:   "original",
			Prompts: []*gqlclient.AgentPromptFragment{
				{Prompt: "continue here", Seq: 7},
			},
		},
	}

	if !in.applyFollowupBootPrompt() {
		t.Fatal("expected follow-up boot prompt to apply")
	}
	if in.agentRun.Prompt != "continue here" {
		t.Fatalf("prompt = %q", in.agentRun.Prompt)
	}
	if in.lastPromptSeq != 7 {
		t.Fatalf("lastPromptSeq = %d", in.lastPromptSeq)
	}
}

func TestApplyFollowupBootPromptSkipsRegularRuns(t *testing.T) {
	in := &agentRunController{
		agentRun: &agentrunv1.AgentRun{
			Prompt: "original",
			Prompts: []*gqlclient.AgentPromptFragment{
				{Prompt: "queued", Seq: 1},
			},
		},
	}

	if in.applyFollowupBootPrompt() {
		t.Fatal("expected non-follow-up run to skip boot prompt rewrite")
	}
	if in.agentRun.Prompt != "original" {
		t.Fatalf("prompt = %q", in.agentRun.Prompt)
	}
}

func TestRestoreFollowupSessionRequiresURL(t *testing.T) {
	in := &agentRunController{
		agentRunID: "run-1",
		agentRun: &agentrunv1.AgentRun{
			Followup: true,
		},
	}

	err := in.restoreFollowupSession(context.Background())
	if err == nil {
		t.Fatal("expected error when follow-up session URL is empty")
	}
}

func TestRestoreFollowupSessionSkipsRegularRuns(t *testing.T) {
	in := &agentRunController{
		agentRun: &agentrunv1.AgentRun{},
	}

	if err := in.restoreFollowupSession(context.Background()); err != nil {
		t.Fatalf("expected non-follow-up run to skip restore: %v", err)
	}
}
