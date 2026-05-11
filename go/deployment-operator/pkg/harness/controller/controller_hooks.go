package controller

import (
	"context"
	"errors"
	"fmt"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	clienterrors "github.com/pluralsh/deployment-operator/internal/errors"
	"github.com/pluralsh/deployment-operator/pkg/harness/environment"
	harnesserrors "github.com/pluralsh/deployment-operator/pkg/harness/errors"
	securityv1 "github.com/pluralsh/deployment-operator/pkg/harness/security/v1"
	"github.com/pluralsh/deployment-operator/pkg/harness/stackrun"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/stackrun/v1"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

var (
	runApproved = false
)

// preStart function is executed before stack run steps.
func (in *stackRunController) preStart() error {
	if in.stackRun.Status != gqlclient.StackStatusPending && !environment.IsDev() {
		klog.Fatalf("could not start stack run: invalid status: %s", in.stackRun.Status)
	}

	if err := stackrun.StartStackRun(in.consoleClient, in.stackRunID); err != nil {
		if clienterrors.IsUnauthenticated(err) {
			return harnesserrors.WrapUnauthenticated("could not update stack run status", err)
		}

		klog.ErrorS(err, "could not update stack run status")
	}

	if in.stackRun.ManageState {
		err := in.tool.ConfigureStateBackend("harness", in.consoleToken, in.stackRun.StateUrls)
		if err != nil {
			return fmt.Errorf("could not configure state backend: %w", err)
		}
	}

	return nil
}

// postStart function is executed after all stack run steps.
func (in *stackRunController) postStart(err error) {
	var status gqlclient.StackStatus

	switch {
	case err == nil:
		status = gqlclient.StackStatusSuccessful
	case errors.Is(err, harnesserrors.ErrUnauthenticated):
		// Console token is expired or invalid; any further API call will also
		// fail with 401/403, so skip console updates and exit cleanly.
		klog.ErrorS(err, "unauthenticated – skipping console status update")
		return
	case errors.Is(err, harnesserrors.ErrRemoteCancel):
		status = gqlclient.StackStatusCancelled
		// Do not send an error if stack run was canceled
		err = nil
	case errors.Is(err, harnesserrors.ErrNoChanges):
		status = gqlclient.StackStatusSuccessful
		// Do not send an error if stack run was canceled due to no changes
		// This allows other queued runs to proceed
		err = nil
	default:
		status = gqlclient.StackStatusFailed
	}

	if err := in.completeStackRun(status, err); err != nil {
		_ = stackrun.MarkStackRun(in.consoleClient, in.stackRunID, gqlclient.StackStatusFailed)
		klog.ErrorS(err, "could not complete stack run")
	}

	klog.V(log.LogLevelInfo).InfoS("stack run completed")
}

// postStepRun is a callback function started by the executor after executable finishes.
// It provides the information about run step that was executed and if it exited with error
// or not.
func (in *stackRunController) postStepRun(id string, err error) {
	var status gqlclient.StepStatus

	switch {
	case errors.Is(err, harnesserrors.ErrNoChanges):
		fallthrough
	case err == nil:
		status = gqlclient.StepStatusSuccessful
	default:
		status = gqlclient.StepStatusFailed
	}

	if err := stackrun.MarkStackRunStep(in.consoleClient, id, status); err != nil {
		if clienterrors.IsUnauthenticated(err) {
			wrapped := harnesserrors.WrapUnauthenticated("could not update stack run step status", err)
			klog.ErrorS(wrapped, "console authentication failed", "step_id", id)
			if in.errChan != nil {
				select {
				case in.errChan <- wrapped:
				default:
				}
			}
			return
		}

		klog.ErrorS(err, "could not update stack run step status")
	}
}

// postExecHook is a callback function started by the exec.Executable after it finishes.
// Unlike postStepRun it does not provide any additional information.
func (in *stackRunController) postExecHook(step *gqlclient.RunStepFragment) v1.HookFunction {
	return func() error {
		if step.Stage == gqlclient.StepStagePlan {
			return in.afterPlan()
		}

		return nil
	}
}

// postExecHook is a callback function started by the exec.Executable before it runs the executable.
func (in *stackRunController) preExecHook(ctx context.Context, step *gqlclient.RunStepFragment) v1.HookFunction {
	return func() error {
		if (step.Stage == gqlclient.StepStageApply || step.Stage == gqlclient.StepStageDestroy) && in.requiresApproval() {
			if err := in.waitForApproval(ctx); err != nil {
				return err
			}
		}

		if err := stackrun.StartStackRunStep(in.consoleClient, step.ID); err != nil {
			if clienterrors.IsUnauthenticated(err) {
				return harnesserrors.WrapUnauthenticated("could not update stack run step status", err)
			}

			klog.ErrorS(err, "could not update stack run status")
		}

		return nil
	}
}

func (in *stackRunController) requiresApproval() bool {
	return in.stackRun.Approval && !runApproved && in.stackRun.ApprovedAt == nil
}

func (in *stackRunController) waitForApproval(ctx context.Context) error {
	// Retry here to make sure that the pending approval status will be set before we start waiting.
	stackrun.MarkStackRunWithRetry(in.consoleClient, in.stackRunID, gqlclient.StackStatusPendingApproval, 5*time.Second)

	klog.V(log.LogLevelInfo).InfoS("waiting for approval to proceed")

	const (
		baseInterval = 5 * time.Second
		maxInterval  = 2 * time.Minute
		factor       = 2.0
	)

	interval := baseInterval
	timer := time.NewTimer(interval)
	defer func() {
		// Stop the timer and drain its channel to avoid goroutine/memory leaks.
		if !timer.Stop() {
			select {
			case <-timer.C:
			default:
			}
		}
	}()

	for {
		select {
		case <-ctx.Done():
			if cause := context.Cause(ctx); cause != nil {
				return cause
			}
			return ctx.Err()
		case <-timer.C:
		}

		if runApproved {
			break
		}

		stack, err := in.consoleClient.GetStackRunApprovedAt(in.stackRunID)
		if err != nil {
			// Back off on error, reset to base on next success.
			interval = min(time.Duration(float64(interval)*factor), maxInterval)

			if clienterrors.IsUnauthenticated(err) {
				return harnesserrors.WrapUnauthenticated("could not check stack run approval", err)
			}

			klog.ErrorS(err, "could not check stack run approval")
			// Timer already fired (drained via case <-timer.C above); safe to Reset.
			timer.Reset(interval)
			continue
		}

		// Successful API call, reset the interval.
		interval = baseInterval

		runApproved = stack != nil && stack.ApprovedAt != nil
		if runApproved {
			break
		}

		// Timer already fired (drained via case <-timer.C above); safe to Reset.
		timer.Reset(interval)
	}

	// Retry here to make sure that we resume the stack run status to running after it has been approved.
	stackrun.MarkStackRunWithRetry(in.consoleClient, in.stackRunID, gqlclient.StackStatusRunning, 5*time.Second)
	return nil
}

func (in *stackRunController) afterPlan() error {
	// Run tool plan
	state, err := in.tool.Plan()
	if err != nil {
		klog.ErrorS(err, "could not prepare plan")
	}

	// Run security scan if enabled
	violations, err := in.tool.Scan()
	if err != nil {
		klog.ErrorS(err, "could not run security scan")
	}

	if err = in.consoleClient.UpdateStackRun(in.stackRunID, gqlclient.StackRunAttributes{
		State:      state,
		Violations: violations,
		Status:     gqlclient.StackStatusRunning,
	}); err != nil {
		if clienterrors.IsUnauthenticated(err) {
			return harnesserrors.WrapUnauthenticated("could not update stack run after plan", err)
		}
		klog.Errorf("could not update stack run after plan: %v", err)
		return err
	}

	if in.stackRun.MaxSeverity() > -1 && securityv1.MaxSeverity(violations) > in.stackRun.MaxSeverity() {
		return fmt.Errorf("security scanner error: max severity violation exceeded")
	}

	klog.V(log.LogLevelInfo).InfoS("checking approve empty status", "approveEmpty", lo.FromPtr(in.stackRun.ApproveEmpty))
	if !lo.FromPtr(in.stackRun.ApproveEmpty) {
		return nil
	}

	// Check if plan has any changes
	hasChanges, err := in.tool.HasChanges()
	if err != nil {
		klog.ErrorS(err, "could not check for plan changes")
		// Continue on error - we don't want to fail the run if change detection fails
	} else if !hasChanges {
		// Return special error to signal no changes
		return harnesserrors.ErrNoChanges
	}

	return nil
}
