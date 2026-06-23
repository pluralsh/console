package controller

import (
	"context"
	"fmt"
	"strings"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	internalerrors "github.com/pluralsh/console/go/deployment-operator/pkg/harness/errors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const approvalFollowUpPollInterval = 5 * time.Second

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
		if prompt == nil || prompt.Seq <= after {
			continue
		}
		if next == nil || prompt.Seq < next.Seq {
			next = prompt
		}
	}
	return next
}

func (in *agentRunController) waitForApprovalFollowUps(ctx context.Context) {
	if !in.requiresApprovalFollowUp() {
		return
	}

	if err := agentrun.MarkAgentRunPendingApproval(ctx, in.consoleClient, in.agentRunID); err != nil {
		in.errChan <- fmt.Errorf("could not update agent run status to pending approval: %w", err)
		return
	}

	klog.V(log.LogLevelInfo).InfoS("waiting for agent run approval or follow-up prompts", "id", in.agentRunID)

	timer := time.NewTimer(approvalFollowUpPollInterval)
	defer timer.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-in.done:
			return
		case <-timer.C:
		}

		run, err := in.consoleClient.GetAgentRun(ctx, in.agentRunID)
		if err != nil {
			klog.ErrorS(err, "could not poll agent run approval state", "id", in.agentRunID)
			timer.Reset(approvalFollowUpPollInterval)
			continue
		}
		if run == nil {
			timer.Reset(approvalFollowUpPollInterval)
			continue
		}
		if run.Status == gqlclient.AgentRunStatusCancelled && !environment.IsDev() {
			in.errChan <- internalerrors.ErrRemoteCancel
			return
		}
		if prompt := nextPrompt(run.Prompts, in.lastPromptSeq); prompt != nil {
			in.lastPromptSeq = prompt.Seq
			if !in.runApprovalFollowUp(ctx, prompt.Prompt) {
				return
			}
			timer.Reset(approvalFollowUpPollInterval)
			continue
		}
		if run.ApprovedAt != nil {
			in.agentRun.ApprovedAt = run.ApprovedAt
			in.agentRun.HeadBranch = run.HeadBranch
			in.approvalPromptSent = true
			headBranch := ""
			if run.HeadBranch != nil {
				headBranch = *run.HeadBranch
			}
			in.runApprovalFollowUp(ctx, buildApprovalGrantedPrompt(headBranch))
			return
		}

		timer.Reset(approvalFollowUpPollInterval)
	}
}

func (in *agentRunController) runApprovalFollowUp(ctx context.Context, prompt string) bool {
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
	in.uploadAgentRunArtifacts(context.Background())
	if in.requiresApprovalFollowUp() {
		if err := agentrun.MarkAgentRunPendingApproval(ctx, in.consoleClient, in.agentRunID); err != nil {
			in.errChan <- fmt.Errorf("could not restore agent run pending approval status: %w", err)
			return false
		}
	}
	return true
}
