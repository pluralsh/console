package agent

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/events"
)

type fakeSocket struct{}

func (fakeSocket) Join() error     { return nil }
func (fakeSocket) Close() error    { return nil }
func (fakeSocket) Connected() bool { return true }

func newTestRunEvents() *runEvents {
	runEvents := newRunEvents()
	runEvents.socket = fakeSocket{}
	return runEvents
}

func TestRunEventsAnswersWithPushedStatus(t *testing.T) {
	runEvents := newTestRunEvents()
	server := httptest.NewServer(runEvents)
	t.Cleanup(server.Close)

	done := make(chan events.Update, 1)
	go func() {
		resp, err := http.Get(server.URL + "?since=0&connected=true")
		if err != nil {
			done <- events.Update{}
			return
		}
		defer resp.Body.Close()
		var update events.Update
		_ = json.NewDecoder(resp.Body).Decode(&update)
		done <- update
	}()

	time.Sleep(50 * time.Millisecond)
	select {
	case got := <-done:
		t.Fatalf("the long-poll must wait for a push, got %+v", got)
	default:
	}

	runEvents.publish(&console.AgentRunStatusFragment{ID: "run-id", Status: console.AgentRunStatusCancelled})
	select {
	case got := <-done:
		require.Equal(t, uint64(1), got.Generation)
		require.True(t, got.Connected)
		require.NotNil(t, got.Run)
		require.Equal(t, console.AgentRunStatusCancelled, got.Run.Status)
	case <-time.After(5 * time.Second):
		t.Fatal("expected the long-poll to answer after the push")
	}

	resp, err := http.Get(server.URL)
	require.NoError(t, err)
	t.Cleanup(func() { _ = resp.Body.Close() })
	require.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestRunEventsAnswersStaleConnectionStateImmediately(t *testing.T) {
	server := httptest.NewServer(newTestRunEvents())
	t.Cleanup(server.Close)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(server.URL + "?since=0&connected=false")
	require.NoError(t, err)
	t.Cleanup(func() { _ = resp.Body.Close() })

	var update events.Update
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&update))
	require.True(t, update.Connected)
	require.Nil(t, update.Run)
}

func TestWatcherKicksSubscribersOnPushedStatus(t *testing.T) {
	runEvents := newTestRunEvents()
	server := httptest.NewServer(runEvents)
	t.Cleanup(server.Close)
	t.Cleanup(func() { _ = runEvents.close() })

	watcher := events.NewWatcher(server.URL)
	first, second := watcher.Subscribe(), watcher.Subscribe()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	go watcher.Run(ctx)

	time.Sleep(50 * time.Millisecond)
	runEvents.publish(&console.AgentRunStatusFragment{ID: "run-id", Status: console.AgentRunStatusRunning})

	require.Eventually(t, func() bool { return watcher.Latest().Run != nil }, 5*time.Second, 10*time.Millisecond)
	for _, kicks := range []<-chan struct{}{first, second} {
		select {
		case <-kicks:
		case <-time.After(5 * time.Second):
			t.Fatal("expected every subscriber to be kicked")
		}
	}
	require.Equal(t, console.AgentRunStatusRunning, watcher.Latest().Run.Status)
}
