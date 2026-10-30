package signals_test

import (
	"context"
	"errors"
	"testing"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	agentsignals "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/signals"
	harnesserrors "github.com/pluralsh/console/go/deployment-operator/pkg/harness/errors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/signals"
	"github.com/pluralsh/console/go/deployment-operator/pkg/test/mocks"
)

func TestConsoleSignalCancelsOnKick(t *testing.T) {
	// Dev builds deliberately ignore remote cancellation.
	version := environment.Version
	environment.Version = "test"
	t.Cleanup(func() { environment.Version = version })

	client := mocks.NewClientMock(t)
	client.On("GetAgentRunStatus", mock.Anything, "run-id").
		Return(&gqlclient.AgentRunStatusFragment{ID: "run-id", Status: gqlclient.AgentRunStatusCancelled}, nil).
		Once()

	kicks := make(chan struct{}, 1)
	ctx := signals.NewCancelableContext(context.Background(), agentsignals.NewConsoleSignal(client, "run-id", kicks))
	kicks <- struct{}{}

	select {
	case <-ctx.Done():
		require.True(t, errors.Is(context.Cause(ctx), harnesserrors.ErrRemoteCancel))
	case <-time.After(5 * time.Second):
		t.Fatal("expected the kick to cancel the run before the fallback poll")
	}
}

func TestConsoleSignalIgnoresRunsStillInProgress(t *testing.T) {
	version := environment.Version
	environment.Version = "test"
	t.Cleanup(func() { environment.Version = version })

	client := mocks.NewClientMock(t)
	checked := make(chan struct{}, 1)
	client.On("GetAgentRunStatus", mock.Anything, "run-id").
		Return(&gqlclient.AgentRunStatusFragment{ID: "run-id", Status: gqlclient.AgentRunStatusRunning}, nil).
		Run(func(mock.Arguments) { checked <- struct{}{} }).
		Once()

	kicks := make(chan struct{}, 1)
	ctx := signals.NewCancelableContext(context.Background(), agentsignals.NewConsoleSignal(client, "run-id", kicks))
	kicks <- struct{}{}

	select {
	case <-checked:
	case <-time.After(5 * time.Second):
		t.Fatal("expected the kick to trigger a status check")
	}
	require.NoError(t, ctx.Err())
}
