package controller

import (
	"context"
	"errors"
	"fmt"
	"os"

	gqlclient "github.com/pluralsh/console/go/client"
	internalerrors "github.com/pluralsh/deployment-operator/pkg/harness/errors"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/agentrun-harness/agentrun"
	"github.com/pluralsh/deployment-operator/pkg/agentrun-harness/environment"
	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/stackrun/v1"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

const bootstrapScriptPath = "/bootstrap/bootstrap.sh"

// preStart function is executed before agent run steps
func (in *agentRunController) preStart() {
	if in.agentRun.Status != gqlclient.AgentRunStatusPending && !environment.IsDev() {
		klog.Fatalf("could not start stack run: invalid status: %s", in.agentRun.Status)
	}

	if err := agentrun.StartAgentRun(in.consoleClient, in.agentRunID); err != nil {
		klog.ErrorS(err, "could not update agent run status to running")
	}
}

// postStart function is executed after all agent run steps
func (in *agentRunController) postStart(err error) {
	var status gqlclient.AgentRunStatus

	switch {
	case err == nil:
		status = gqlclient.AgentRunStatusSuccessful
	case errors.Is(err, internalerrors.ErrRemoteCancel):
		status = gqlclient.AgentRunStatusCancelled
		// Do not send an error if agent run was cancelled
		err = nil
	default:
		status = gqlclient.AgentRunStatusFailed
	}

	if err := in.completeAgentRun(status, err); err != nil {
		if updateErr := agentrun.FailAgentRun(in.consoleClient, in.agentRunID, err.Error()); updateErr != nil {
			klog.ErrorS(updateErr, "could not mark agent run as failed")
		}
		klog.ErrorS(err, "could not complete agent run")
	}

	klog.V(log.LogLevelExtended).InfoS("agent run completed")
}

// postExecHook is a callback function started by the exec.Executable after it finishes
func (in *agentRunController) postExecHook() v1.HookFunction {
	return func() error {
		klog.V(log.LogLevelDebug).InfoS("post exec hook")
		// Signal that the initial AI run has finished so the babysit loop
		// can start.
		select {
		case <-in.runDone:
			// already closed
		default:
			close(in.runDone)
		}
		return nil
	}
}

// preExecHook is a callback function started by the exec.Executable before it runs
func (in *agentRunController) preExecHook() v1.HookFunction {
	return func() error {
		klog.V(log.LogLevelInfo).InfoS("starting agent CLI execution", "runtime", in.agentRun.Runtime.Type)

		if err := in.validateAgentRunStatus(); err != nil {
			return err
		}

		return in.runBootstrapScript()
	}
}

// runBootstrapScript executes the bootstrap script mounted at bootstrapScriptPath
// inside the cloned repository directory, before the coding agent is invoked.
func (in *agentRunController) runBootstrapScript() error {
	if _, err := os.Stat(bootstrapScriptPath); err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("failed to stat bootstrap script: %w", err)
	}

	klog.V(log.LogLevelInfo).InfoS("running bootstrap script", "path", bootstrapScriptPath, "dir", in.dir)

	return exec.NewExecutable("bash",
		exec.WithArgs([]string{bootstrapScriptPath}),
		exec.WithDir(in.dir),
	).Run(context.Background())
}

// validateAgentRunStatus checks if agent run can be started
func (in *agentRunController) validateAgentRunStatus() error {
	if in.agentRun.Status != gqlclient.AgentRunStatusPending && !environment.IsDev() {
		return fmt.Errorf("could not start agent run: invalid status: %s", in.agentRun.Status)
	}
	return nil
}
