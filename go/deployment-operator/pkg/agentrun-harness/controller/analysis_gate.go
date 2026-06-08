package controller

import (
	"context"
	"fmt"
	"strings"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const (
	maxAnalysisFollowUps       = 3
	initialRunErrYieldDeadline = 15 * time.Millisecond
)

// analysisPersistPollDelay is mutable so tests can shorten waits via TestMain.
var analysisPersistPollDelay = time.Second

func analysisPersisted(frag *gqlclient.AgentRunFragment) bool {
	if frag == nil || frag.Analysis == nil {
		return false
	}
	summary := strings.TrimSpace(frag.Analysis.Summary)
	body := strings.TrimSpace(frag.Analysis.Analysis)
	return summary != "" && body != ""
}

func buildAnalysisFollowUpPrompt(attempt int) string {
	return fmt.Sprintf(
		"You finished the previous turn without calling the MCP tool updateAgentRunAnalysis (follow-up %d/%d). "+
			"You must call updateAgentRunAnalysis now with a non-empty summary and detailed analysis reflecting your investigation. "+
			"Do not end the session until that tool call succeeds.",
		attempt,
		maxAnalysisFollowUps,
	)
}

// requeuePendingInitialRunError non-destructively detects an error already
// posted to errChan after the initial CLI run (postExecHook closes runDone
// before the tool goroutine may send on errChan). If an error is present it
// is re-queued for the main Start() select.
func (in *agentRunController) requeuePendingInitialRunError() bool {
	deadline := time.Now().Add(initialRunErrYieldDeadline)
	for time.Now().Before(deadline) {
		select {
		case err := <-in.errChan:
			in.errChan <- err
			return true
		default:
			time.Sleep(2 * time.Millisecond)
		}
	}
	return false
}

func analysisGateEnabled(mode gqlclient.AgentRunMode) bool {
	return mode == gqlclient.AgentRunModeAnalyze || mode == gqlclient.AgentRunModeWrite
}

func (in *agentRunController) ensureAnalysisPersistedAfterInitialRun(ctx context.Context) {
	if !analysisGateEnabled(in.agentRun.Mode) {
		return
	}
	if ctx.Err() != nil {
		return
	}
	if in.requeuePendingInitialRunError() {
		klog.V(log.LogLevelInfo).InfoS("skipping analysis verification: initial run failed")
		return
	}

	for i := 0; i <= maxAnalysisFollowUps; i++ {
		if err := ctx.Err(); err != nil {
			return
		}
		if i > 0 {
			select {
			case <-ctx.Done():
				return
			case <-time.After(analysisPersistPollDelay):
			}
		}

		frag, err := in.consoleClient.GetAgentRun(ctx, in.agentRunID)
		if err != nil {
			in.errChan <- fmt.Errorf("get agent run for analysis verification: %w", err)
			return
		}
		if analysisPersisted(frag) {
			klog.V(log.LogLevelInfo).InfoS("analysis verification satisfied", "attempt", i)
			return
		}
		if i == maxAnalysisFollowUps {
			in.errChan <- fmt.Errorf(
				"agent run finished in %s mode without calling updateAgentRunAnalysis after follow-up reprompts",
				in.agentRun.Mode,
			)
			return
		}

		klog.V(log.LogLevelInfo).InfoS("analysis missing after initial or follow-up run; reprompting", "followUp", i+1)
		err = in.tool.AnalysisFollowUpRun(ctx, buildAnalysisFollowUpPrompt(i+1))
		in.uploadAgentRunArtifacts(context.Background())
		if err != nil {
			in.errChan <- err
			return
		}
	}
}
