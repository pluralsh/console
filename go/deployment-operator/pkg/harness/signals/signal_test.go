package signals_test

import (
	"context"
	"errors"
	"testing"
	"time"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/environment"
	harnesserrors "github.com/pluralsh/console/go/deployment-operator/pkg/harness/errors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/signals"
	"github.com/pluralsh/console/go/deployment-operator/pkg/test/mocks"
	"github.com/pluralsh/console/go/deployment-operator/pkg/websocket"
)

type fakeSocket struct {
	publishers map[string]websocket.Publisher
}

func (s *fakeSocket) AddPublisher(event string, publisher websocket.Publisher) {
	s.publishers[event] = publisher
}
func (s *fakeSocket) Join() error  { return nil }
func (s *fakeSocket) Close() error { return nil }

func TestConsoleSignalCancelsOnPushedNotification(t *testing.T) {
	// Dev builds deliberately ignore remote cancellation.
	version := environment.Version
	environment.Version = "test"
	t.Cleanup(func() { environment.Version = version })

	client := mocks.NewClientMock(t)
	client.On("GetStackRunStatus", "run-id").
		Return(&gqlclient.GetStackRunStatus_StackRun{ID: "run-id", Status: gqlclient.StackStatusCancelled}, nil).
		Once()

	socket := &fakeSocket{publishers: map[string]websocket.Publisher{}}
	ctx := signals.NewCancelableContext(context.Background(), signals.NewConsoleSignal(client, "run-id", socket))

	publisher := socket.publishers["stack_run"]
	require.NotNil(t, publisher)

	publisher.Publish("other-run", false)
	publisher.Publish("run-id", false)

	select {
	case <-ctx.Done():
		require.True(t, errors.Is(context.Cause(ctx), harnesserrors.ErrRemoteCancel))
	case <-time.After(5 * time.Second):
		t.Fatal("expected the pushed notification to cancel the run before the fallback poll")
	}
}

func TestConsoleSignalIgnoresRunsStillInProgress(t *testing.T) {
	client := mocks.NewClientMock(t)
	checked := make(chan struct{}, 1)
	client.On("GetStackRunStatus", "run-id").
		Return(&gqlclient.GetStackRunStatus_StackRun{ID: "run-id", Status: gqlclient.StackStatusRunning}, nil).
		Run(func(mock.Arguments) { checked <- struct{}{} })

	socket := &fakeSocket{publishers: map[string]websocket.Publisher{}}
	ctx := signals.NewCancelableContext(context.Background(), signals.NewConsoleSignal(client, "run-id", socket))

	socket.publishers["stack_run"].Publish("run-id", false)

	select {
	case <-checked:
	case <-time.After(5 * time.Second):
		t.Fatal("expected the pushed notification to trigger a status check")
	}
	require.NoError(t, ctx.Err())
}
