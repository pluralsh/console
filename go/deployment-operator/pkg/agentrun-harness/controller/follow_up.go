package controller

import (
	"context"
	"fmt"
	"strings"

	gqlclient "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

// runFollowUpPrompt re-invokes the provider in the same session with a new user
// or harness-authored prompt. When restorePendingApproval is true the run is
// returned to pending_approval after the follow-up so the post-run poll loop
// can continue waiting for approval.
func (in *agentRunController) runFollowUpPrompt(ctx context.Context, prompt string, restorePendingApproval bool) bool {
	prompt = strings.TrimSpace(prompt)
	if prompt == "" {
		return true
	}

	if _, err := in.updateAgentRun(ctx, gqlclient.AgentRunStatusAttributes{Status: gqlclient.AgentRunStatusRunning}); err != nil {
		in.errChan <- fmt.Errorf("could not update agent run status before follow-up: %w", err)
		return false
	}

	if err := in.tool.FollowUpRun(ctx, prompt); err != nil {
		in.errChan <- err
		return false
	}

	if restorePendingApproval && in.requiresApprovalFollowUp() {
		if err := in.enterPendingApproval(ctx); err != nil {
			in.errChan <- err
			return false
		}
	} else {
		in.uploadAgentRunArtifacts(context.Background())
	}

	return true
}

// dispatchQueuedUserPrompt consumes the next queued user prompt, if the polled status lists one.
// The full run, with prompt text and attachments, is only fetched then. Returns true when a
// prompt was dispatched.
func (in *agentRunController) dispatchQueuedUserPrompt(ctx context.Context, status *gqlclient.AgentRunStatusFragment, restorePendingApproval bool) bool {
	if !hasPromptAfter(status.Prompts, in.lastPromptSeq) {
		return false
	}

	run, err := in.consoleClient.GetAgentRun(ctx, in.agentRunID)
	if err != nil {
		klog.ErrorS(err, "could not fetch queued user prompts", "id", in.agentRunID)
		return false
	}
	if nextPrompt(run.Prompts, in.lastPromptSeq) == nil {
		// Only blank prompts are queued, which are never dispatched, so don't refetch for them.
		in.lastPromptSeq = max(in.lastPromptSeq, maxPromptSeq(run.Prompts))
		return false
	}
	return in.tryDispatchQueuedUserPrompt(ctx, run, restorePendingApproval)
}

func hasPromptAfter(prompts []*gqlclient.AgentRunStatusFragment_Prompts, after int64) bool {
	for _, prompt := range prompts {
		if prompt != nil && prompt.Seq > after {
			return true
		}
	}
	return false
}

// tryDispatchQueuedUserPrompt consumes the next queued user prompt, if any.
// Returns true when a prompt was dispatched.
func (in *agentRunController) tryDispatchQueuedUserPrompt(ctx context.Context, run *gqlclient.AgentRunFragment, restorePendingApproval bool) bool {
	prompt := nextPrompt(run.Prompts, in.lastPromptSeq)
	if prompt == nil {
		return false
	}

	in.lastPromptSeq = prompt.Seq
	klog.V(log.LogLevelInfo).InfoS(
		"dispatching queued user prompt",
		"id", in.agentRunID,
		"seq", prompt.Seq,
		"restorePendingApproval", restorePendingApproval,
	)
	text := in.withAttachments(ctx, promptAttachmentsDir(prompt.Seq), prompt.Prompt, prompt.Attachments)
	return in.runFollowUpPrompt(ctx, text, restorePendingApproval)
}

// dispatchApprovalGrantedPrompt unlocks PR creation after the user approves.
func (in *agentRunController) dispatchApprovalGrantedPrompt(ctx context.Context, run *gqlclient.AgentRunStatusFragment) bool {
	in.agentRun.ApprovedAt = run.ApprovedAt
	in.agentRun.HeadBranch = run.HeadBranch
	in.approvalPromptSent = true

	headBranch := ""
	if run.HeadBranch != nil {
		headBranch = *run.HeadBranch
	}

	klog.V(log.LogLevelInfo).InfoS(
		"agent run approved, sending PR follow-up prompt",
		"id", in.agentRunID,
		"headBranch", headBranch,
	)
	return in.runFollowUpPrompt(ctx, buildApprovalGrantedPrompt(headBranch), false)
}
