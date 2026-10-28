package agent

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/events"
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

func TestRunEventsAnswersOnceGenerationChanges(t *testing.T) {
	socket := &fakeSocket{publishers: map[string]websocket.Publisher{}}
	runEvents := newRunEvents("run-id", socket)
	server := httptest.NewServer(runEvents)
	t.Cleanup(server.Close)

	done := make(chan string, 1)
	go func() {
		resp, err := http.Get(server.URL + "?since=0")
		if err != nil {
			done <- err.Error()
			return
		}
		defer resp.Body.Close()
		body := make([]byte, 8)
		n, _ := resp.Body.Read(body)
		done <- string(body[:n])
	}()

	time.Sleep(50 * time.Millisecond)
	socket.publishers[agentRunNotification].Publish("other-run", false)
	select {
	case got := <-done:
		t.Fatalf("other runs must not answer the long-poll, got %q", got)
	case <-time.After(50 * time.Millisecond):
	}

	socket.publishers[agentRunNotification].Publish("run-id", false)
	select {
	case got := <-done:
		require.Equal(t, "1", got)
	case <-time.After(5 * time.Second):
		t.Fatal("expected the long-poll to answer after the run's notification")
	}

	resp, err := http.Get(server.URL + "?since=0")
	require.NoError(t, err)
	t.Cleanup(func() { _ = resp.Body.Close() })
	require.Equal(t, http.StatusOK, resp.StatusCode)

	resp, err = http.Get(server.URL)
	require.NoError(t, err)
	t.Cleanup(func() { _ = resp.Body.Close() })
	require.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestWatcherKicksSubscribersOnRunEvents(t *testing.T) {
	socket := &fakeSocket{publishers: map[string]websocket.Publisher{}}
	runEvents := newRunEvents("run-id", socket)
	server := httptest.NewServer(runEvents)
	t.Cleanup(server.Close)
	t.Cleanup(func() { _ = runEvents.close() })

	watcher := events.NewWatcher(server.URL)
	first, second := watcher.Subscribe(), watcher.Subscribe()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	go watcher.Run(ctx)

	time.Sleep(50 * time.Millisecond)
	socket.publishers[agentRunNotification].Publish("run-id", false)

	for _, kicks := range []<-chan struct{}{first, second} {
		select {
		case <-kicks:
		case <-time.After(5 * time.Second):
			t.Fatal("expected every subscriber to be kicked")
		}
	}
}
