package controller

import (
	"context"
	"fmt"
	"strings"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

// applyFollowupBootPrompt rewrites the harness run prompt when this is a
// cold-start follow-up with a queued AgentPrompt. The original run prompt is
// replaced so Run()/ResumeFollowup feeds the pending user message instead.
//
// lastPromptSeq is advanced so approval/babysit loops do not redisatch it.
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
	in.lastPromptSeq = prompt.Seq
	klog.V(log.LogLevelInfo).InfoS(
		"configured follow-up boot prompt",
		"id", in.agentRunID,
		"seq", prompt.Seq,
	)
	return true
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
