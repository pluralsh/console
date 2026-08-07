package controller

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
)

func TestCheckoutFollowupBranchRequiresHeadBranch(t *testing.T) {
	controller := &agentRunController{
		agentRun: &agentrunv1.AgentRun{Followup: true},
	}

	err := controller.checkoutFollowupBranch(context.Background(), t.TempDir())

	require.EqualError(t, err, "follow-up agent run requires a head branch to check out")
}

func TestCheckoutFollowupBranchSkipsRegularRuns(t *testing.T) {
	controller := &agentRunController{
		agentRun: &agentrunv1.AgentRun{},
	}

	require.NoError(t, controller.checkoutFollowupBranch(context.Background(), t.TempDir()))
}
