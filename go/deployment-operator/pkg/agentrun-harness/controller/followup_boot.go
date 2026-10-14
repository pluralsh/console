package controller

import (
	"context"
	"fmt"
	"strings"

	gqlclient "github.com/pluralsh/console/go/client"
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

	prompt := latestPendingPrompt(in.agentRun.Prompts)
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
func (in *agentRunController) restoreFollowupSession(ctx context.Context) error {
	if in.agentRun == nil || !in.agentRun.Followup {
		return nil
	}

	url := strings.TrimSpace(in.agentRun.SessionURL)
	if url == "" {
		return fmt.Errorf("follow-up agent run %s has no session URL to restore", in.agentRunID)
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

func latestPendingPrompt(prompts []*gqlclient.AgentPromptFragment) *gqlclient.AgentPromptFragment {
	var latest *gqlclient.AgentPromptFragment
	for _, prompt := range prompts {
		if prompt == nil || strings.TrimSpace(prompt.Prompt) == "" {
			continue
		}
		if latest == nil || prompt.Seq > latest.Seq {
			latest = prompt
		}
	}
	return latest
}
