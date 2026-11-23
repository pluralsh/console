package controller

import (
	"fmt"
	"testing"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	harnesserrors "github.com/pluralsh/console/go/deployment-operator/pkg/harness/errors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	stackrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/stackrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/v1"
)

func TestValidateStartStatus(t *testing.T) {
	for _, status := range []gqlclient.StackStatus{
		gqlclient.StackStatusPending,
		gqlclient.StackStatusRunning,
		gqlclient.StackStatusPendingApproval,
	} {
		require.NoError(t, validateStartStatus(status), status)
	}

	require.ErrorIs(t, validateStartStatus(gqlclient.StackStatusCancelled), harnesserrors.ErrRemoteCancel)

	for _, status := range []gqlclient.StackStatus{
		gqlclient.StackStatusSuccessful,
		gqlclient.StackStatusFailed,
	} {
		require.ErrorIs(t, validateStartStatus(status), harnesserrors.ErrInvalidStatus, status)
	}
}

func TestPrepareRunAllApplySetsFilters(t *testing.T) {
	ctrl := &stackRunController{
		stackRun: &stackrunv1.StackRun{RunAll: true},
		tool:     &applyPreparer{args: []string{"run", "--all", "--filter", "./app", "apply"}},
	}
	command := exec.NewExecutable("terragrunt", exec.WithArgs([]string{"run", "--all", "apply"}))

	err := ctrl.prepareRunAllApply(&gqlclient.RunStepFragment{Stage: gqlclient.StepStageApply}, command)

	require.NoError(t, err)
	setter := command.(interface{ Args() []string })
	assert.Equal(t, []string{"run", "--all", "--filter", "./app", "apply"}, setter.Args())
}

func TestPrepareRunAllApplyFailsWhenPlansCannotBeRead(t *testing.T) {
	ctrl := &stackRunController{
		stackRun: &stackrunv1.StackRun{RunAll: true},
		tool:     &applyPreparer{err: fmt.Errorf("missing json")},
	}
	command := exec.NewExecutable("terragrunt", exec.WithArgs([]string{"apply"}))

	err := ctrl.prepareRunAllApply(&gqlclient.RunStepFragment{Stage: gqlclient.StepStageApply}, command)

	require.Error(t, err)
	setter := command.(interface{ Args() []string })
	assert.Equal(t, []string{"apply"}, setter.Args())
}

func TestPrepareRunAllApplyIgnoresOtherStages(t *testing.T) {
	ctrl := &stackRunController{
		stackRun: &stackrunv1.StackRun{RunAll: true},
		tool:     &applyPreparer{err: fmt.Errorf("should not be called")},
	}
	command := exec.NewExecutable("terragrunt", exec.WithArgs([]string{"plan"}))

	err := ctrl.prepareRunAllApply(&gqlclient.RunStepFragment{Stage: gqlclient.StepStagePlan}, command)

	require.NoError(t, err)
}

func TestAfterPlanRunAllStopsWhenPlanOrScanFails(t *testing.T) {
	planCtrl := &stackRunController{
		stackRun: &stackrunv1.StackRun{RunAll: true},
		tool:     &planScanner{planErr: fmt.Errorf("show failed")},
	}
	require.Error(t, planCtrl.afterPlan())

	scanCtrl := &stackRunController{
		stackRun: &stackrunv1.StackRun{RunAll: true},
		tool:     &planScanner{scanErr: fmt.Errorf("trivy failed")},
	}
	require.Error(t, scanCtrl.afterPlan())
}

type applyPreparer struct {
	toolv1.DefaultTool
	args []string
	err  error
}

func (in *applyPreparer) ApplyArgs([]string) ([]string, error) {
	if in.err != nil {
		return nil, in.err
	}
	return in.args, nil
}

type planScanner struct {
	toolv1.DefaultTool
	planErr error
	scanErr error
}

func (in *planScanner) Plan() (*gqlclient.StackStateAttributes, error) {
	if in.planErr != nil {
		return nil, in.planErr
	}
	plan := "plan"
	return &gqlclient.StackStateAttributes{Plan: &plan}, nil
}

func (in *planScanner) Scan() ([]*gqlclient.StackPolicyViolationAttributes, error) {
	if in.scanErr != nil {
		return nil, in.scanErr
	}
	return nil, nil
}
