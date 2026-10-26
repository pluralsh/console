package controller

import (
	"context"
	"fmt"
	"strings"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

// applyFollowupBootPrompt rewrites the in-memory harness run prompt when this
// is a cold-start follow-up with a queued AgentPrompt. AgentRun.prompt in the
// API stays the original task; only the turn text / attachments are replaced
// so Run()/ResumeFollowup feeds the pending user message.
//
// lastPromptSeq is advanced so approval/babysit loops do not redisatch it.
//
// Returns false for workbench PR follow-ups (Followup without a session),
// which cold-start as TurnKindInitial using AgentRun.prompt.
func (in *agentRunController) applyFollowupBootPrompt() bool {
	if in.agentRun == nil || !in.agentRun.Followup {
		return false
	}

	// Oldest pending prompt first so prompts queued while the run is still
	// pending remain available for later dispatch via nextPrompt.
	prompt := nextPrompt(in.agentRun.Prompts, 0)
	if prompt == nil {
		return false
	}

	in.agentRun.Prompt = prompt.Prompt
	in.agentRun.Attachments = prompt.Attachments
	in.lastPromptSeq = prompt.Seq
	klog.V(log.LogLevelInfo).InfoS(
		"configured follow-up boot prompt",
		"id", in.agentRunID,
		"seq", prompt.Seq,
	)
	return true
}

// requireFollowupBootPrompt fails terminal session restores that have no queued
// AgentPrompt, so the harness never re-runs the original AgentRun.prompt.
func (in *agentRunController) requireFollowupBootPrompt(resumeFollowup bool) error {
	if in.agentRun == nil || !in.agentRun.Followup {
		return nil
	}
	if strings.TrimSpace(in.agentRun.SessionURL) == "" {
		return nil
	}
	if resumeFollowup {
		return nil
	}
	return fmt.Errorf(
		"follow-up agent run %s has a session to restore but no queued AgentPrompt",
		in.agentRunID,
	)
}

// restoreFollowupSession downloads and restores the uploaded session archive
// when this run is a follow-up with a session URL.
//
// Workbench PR follow-ups create new runs with Followup=true but no prior
// session upload; those cold-start without restore. Terminal reprompts already
// validate a session exists server-side before requeueing.
func (in *agentRunController) restoreFollowupSession(ctx context.Context) error {
	if in.agentRun == nil || !in.agentRun.Followup {
		return nil
	}

	url := strings.TrimSpace(in.agentRun.SessionURL)
	if url == "" {
		klog.V(log.LogLevelInfo).InfoS(
			"follow-up agent run has no session URL; starting without session restore",
			"id", in.agentRunID,
		)
		return nil
	}

	sessionID, err := in.tool.RestoreSession(ctx, url)
	if err != nil {
		return fmt.Errorf("restore follow-up session: %w", err)
	}
	klog.V(log.LogLevelInfo).InfoS(
		"restored agent run session for follow-up",
		"id", in.agentRunID,
		"sessionID", sessionID,
	)
	return nil
}
