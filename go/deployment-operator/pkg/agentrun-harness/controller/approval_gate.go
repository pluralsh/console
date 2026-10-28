package controller

import (
	"context"
	"fmt"
	"strings"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	internalerrors "github.com/pluralsh/console/go/deployment-operator/pkg/harness/errors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

func buildApprovalGrantedPrompt(headBranch string) string {
	msg := "The user has approved these changes. You may now create a pull request using the agentPullRequest MCP tool."
	if branch := strings.TrimSpace(headBranch); branch != "" {
		msg += fmt.Sprintf(" Use head %q exactly (this is the branch createBranch already created and pushed).", branch)
	} else {
		msg += " No head branch was recorded on this agent run — call createBranch first to commit and push your changes, then call agentPullRequest with that branch name as head."
	}
	msg += " Do not make additional code changes unless they are strictly necessary to create the PR."
	return msg
}

// enterPendingApproval uploads the current git diff (and session artifacts) so
// reviewers can inspect changes, then marks the run as pending approval.
func (in *agentRunController) enterPendingApproval(ctx context.Context) error {
	in.uploadAgentRunArtifacts(ctx)
	if _, err := in.updateAgentRun(ctx, gqlclient.AgentRunStatusAttributes{Status: gqlclient.AgentRunStatusPendingApproval}); err != nil {
		return fmt.Errorf("could not update agent run status to pending approval: %w", err)
	}
	return nil
}

func (in *agentRunController) requiresApprovalFollowUp() bool {
	return in.agentRun.Approval && !in.approvalPromptSent
}

func (in *agentRunController) initializePromptCursor() {
	in.lastPromptSeq = maxPromptSeq(in.agentRun.Prompts)
}

func maxPromptSeq(prompts []*gqlclient.AgentPromptFragment) int64 {
	var max int64
	for _, prompt := range prompts {
		if prompt != nil && prompt.Seq > max {
			max = prompt.Seq
		}
	}
	return max
}

func nextPrompt(prompts []*gqlclient.AgentPromptFragment, after int64) *gqlclient.AgentPromptFragment {
	var next *gqlclient.AgentPromptFragment
	for _, prompt := range prompts {
		if prompt == nil || prompt.Seq <= after || strings.TrimSpace(prompt.Prompt) == "" {
			continue
		}
		if next == nil || prompt.Seq < next.Seq {
			next = prompt
		}
	}
	return next
}

// runPostRunPollLoop waits after the initial autonomous run for either:
//   - a queued user prompt → dispatch via FollowUpRun in the same session
//   - approval → dispatch the PR-creation prompt, then exit into babysit (if enabled)
//
// This only runs when approval is required. Babysit mode handles further user
// prompts alongside PR polling in runBabysitPR.
func (in *agentRunController) runPostRunPollLoop(ctx context.Context) {
	if !in.requiresApprovalFollowUp() {
		return
	}

	if err := in.enterPendingApproval(ctx); err != nil {
		in.errChan <- err
		return
	}

	klog.V(log.LogLevelInfo).InfoS("waiting for agent run approval or follow-up prompts", "id", in.agentRunID)

	for {
		if in.waitForPoll(ctx) {
			return
		}

		run, err := in.consoleClient.GetAgentRunStatus(ctx, in.agentRunID)
		if err != nil {
			klog.ErrorS(err, "could not poll agent run state", "id", in.agentRunID)
			continue
		}
		if run.Status == gqlclient.AgentRunStatusCancelled && !environment.IsDev() {
			in.errChan <- internalerrors.ErrRemoteCancel
			return
		}

		// User prompts take priority — agent keeps working while approval is pending.
		if in.dispatchQueuedUserPrompt(ctx, run, true) {
			continue
		}

		if run.ApprovedAt != nil {
			in.dispatchApprovalGrantedPrompt(ctx, run)
			return
		}
	}
}

// waitForPoll waits for the next prompt poll tick or a Console kick. Returns true when the
// controller is shutting down.
func (in *agentRunController) waitForPoll(ctx context.Context) bool {
	return in.waitForPollUpTo(ctx, in.promptPollInterval())
}

// waitForPollUpTo is waitForPoll, but ticks after at most limit.
func (in *agentRunController) waitForPollUpTo(ctx context.Context, limit time.Duration) bool {
	timer := time.NewTimer(min(limit, in.promptPollInterval()))
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return true
	case <-in.done:
		return true
	case <-timer.C:
	case <-in.kicks:
	}
	return false
}
