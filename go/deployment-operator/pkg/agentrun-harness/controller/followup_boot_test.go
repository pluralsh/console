package controller

import (
	"context"
	"testing"

	gqlclient "github.com/pluralsh/console/go/client"

	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
)

func TestApplyFollowupBootPromptUsesOldestPending(t *testing.T) {
	in := &agentRunController{
		agentRunID: "run-1",
		agentRun: &agentrunv1.AgentRun{
			Followup: true,
			Prompt:   "original",
			Prompts: []*gqlclient.AgentPromptFragment{
				{Prompt: "first", Seq: 1},
				{Prompt: "third", Seq: 3},
				{Prompt: "second", Seq: 2},
				nil,
				{Prompt: "   ", Seq: 4},
			},
		},
	}

	if !in.applyFollowupBootPrompt() {
		t.Fatal("expected follow-up boot prompt to apply")
	}
	if in.agentRun.Prompt != "first" {
		t.Fatalf("prompt = %q, want first", in.agentRun.Prompt)
	}
	if in.lastPromptSeq != 1 {
		t.Fatalf("lastPromptSeq = %d, want 1 so later prompts remain dispatchable", in.lastPromptSeq)
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

func TestApplyFollowupBootPromptSkipsWhenNoQueuedPrompt(t *testing.T) {
	in := &agentRunController{
		agentRun: &agentrunv1.AgentRun{
			Followup:   true,
			Prompt:     "original",
			SessionURL: "https://example.com/session.tar.gz",
		},
	}

	if in.applyFollowupBootPrompt() {
		t.Fatal("expected missing AgentPrompt to skip boot rewrite")
	}
	if in.agentRun.Prompt != "original" {
		t.Fatalf("prompt = %q, want original left unchanged", in.agentRun.Prompt)
	}
}

func TestRequireFollowupBootPromptErrorsWithoutQueuedPrompt(t *testing.T) {
	in := &agentRunController{
		agentRunID: "run-1",
		agentRun: &agentrunv1.AgentRun{
			Followup:   true,
			SessionURL: "https://example.com/session.tar.gz",
		},
	}

	if err := in.requireFollowupBootPrompt(false); err == nil {
		t.Fatal("expected error when session follow-up has no queued AgentPrompt")
	}
}

func TestRequireFollowupBootPromptAllowsWorkbenchFollowup(t *testing.T) {
	in := &agentRunController{
		agentRun: &agentrunv1.AgentRun{
			Followup: true,
			Prompt:   "pr follow-up work",
		},
	}

	if err := in.requireFollowupBootPrompt(false); err != nil {
		t.Fatalf("expected workbench follow-up without session to cold-start: %v", err)
	}
}

func TestApplyFollowupBootPromptSkipsWorkbenchFollowupWithoutSession(t *testing.T) {
	in := &agentRunController{
		agentRun: &agentrunv1.AgentRun{
			Followup: true,
			Prompt:   "pr follow-up work",
		},
	}

	if in.applyFollowupBootPrompt() {
		t.Fatal("expected workbench follow-up without session to cold-start as initial turn")
	}
}

func TestRestoreFollowupSessionSkipsWhenURLEmpty(t *testing.T) {
	in := &agentRunController{
		agentRunID: "run-1",
		agentRun: &agentrunv1.AgentRun{
			Followup: true,
		},
	}

	if err := in.restoreFollowupSession(context.Background()); err != nil {
		t.Fatalf("expected empty session URL to skip restore for PR follow-ups: %v", err)
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
