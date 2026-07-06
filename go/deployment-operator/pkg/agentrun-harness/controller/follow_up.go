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

	if _, err := in.consoleClient.UpdateAgentRun(ctx, in.agentRunID, gqlclient.AgentRunStatusAttributes{Status: gqlclient.AgentRunStatusRunning}); err != nil {
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
	return in.runFollowUpPrompt(ctx, prompt.Prompt, restorePendingApproval)
}

// dispatchApprovalGrantedPrompt unlocks PR creation after the user approves.
func (in *agentRunController) dispatchApprovalGrantedPrompt(ctx context.Context, run *gqlclient.AgentRunFragment) bool {
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
