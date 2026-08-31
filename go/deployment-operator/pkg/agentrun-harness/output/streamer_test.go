package output

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/deployment-operator/pkg/test/mocks"
)

func TestStreamerFlushesOnSizeLimit(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	var got string
	var mu sync.Mutex
	m.On("AgentMessageOutput", mock.Anything, mock.MatchedBy(func(attrs console.AgentMessageOutputAttributes) bool {
		mu.Lock()
		defer mu.Unlock()
		if attrs.Stdout != nil {
			got += *attrs.Stdout
		}
		return attrs.MessageID == "msg-1"
	})).Return(nil)

	s := New(t.Context(), m).WithSizeLimit(4).WithFlushInterval(time.Hour)
	s.Write("call-1", "msg-1", "abcd")
	s.Close("call-1")

	mu.Lock()
	defer mu.Unlock()
	require.Equal(t, "abcd", got)
}

func TestStreamerWritesDeltasFromAccumulatedOutput(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	var got string
	var mu sync.Mutex
	m.On("AgentMessageOutput", mock.Anything, mock.MatchedBy(func(attrs console.AgentMessageOutputAttributes) bool {
		mu.Lock()
		defer mu.Unlock()
		if attrs.Stdout != nil {
			got += *attrs.Stdout
		}
		return attrs.MessageID == "msg-1"
	})).Return(nil)

	s := New(t.Context(), m).WithSizeLimit(1024).WithFlushInterval(time.Hour)
	s.Write("call-1", "msg-1", "hello")
	s.Write("call-1", "msg-1", "hello\nworld")
	s.Close("call-1")

	mu.Lock()
	defer mu.Unlock()
	require.Equal(t, "hello\nworld", got)
}

func TestStreamerFlushesOnInterval(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	done := make(chan struct{})
	m.On("AgentMessageOutput", mock.Anything, mock.MatchedBy(func(attrs console.AgentMessageOutputAttributes) bool {
		return attrs.MessageID == "msg-1" && attrs.Stdout != nil && *attrs.Stdout == "tick"
	})).Return(nil).Run(func(mock.Arguments) {
		close(done)
	})

	s := New(t.Context(), m).WithSizeLimit(1024).WithFlushInterval(20 * time.Millisecond)
	s.Write("call-1", "msg-1", "tick")
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for interval flush")
	}
	s.Close("call-1")
}

func TestStreamerDoesNotRetryFailedFlush(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	var got string
	var mu sync.Mutex
	m.On("AgentMessageOutput", mock.Anything, mock.MatchedBy(func(attrs console.AgentMessageOutputAttributes) bool {
		return attrs.MessageID == "msg-1" && attrs.Stdout != nil && *attrs.Stdout == "abcd"
	})).Return(errors.New("transient")).Once()
	m.On("AgentMessageOutput", mock.Anything, mock.MatchedBy(func(attrs console.AgentMessageOutputAttributes) bool {
		mu.Lock()
		defer mu.Unlock()
		if attrs.Stdout != nil {
			got += *attrs.Stdout
		}
		return attrs.MessageID == "msg-1"
	})).Return(nil)

	s := New(t.Context(), m).WithSizeLimit(4).WithFlushInterval(time.Hour)
	s.Write("call-1", "msg-1", "abcd")
	s.Write("call-1", "msg-1", "abcdefgh")
	s.Close("call-1")

	mu.Lock()
	defer mu.Unlock()
	require.Equal(t, "efgh", got)
}

func TestStreamerDoesNotRetryFailedFinalFlush(t *testing.T) {
	for _, closeAll := range []bool{false, true} {
		name := "Close"
		if closeAll {
			name = "CloseAll"
		}
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			m := mocks.NewClientMock(t)
			m.On("AgentMessageOutput", mock.Anything, mock.Anything).
				Return(errors.New("transient")).Once()

			s := New(t.Context(), m).WithSizeLimit(1024).WithFlushInterval(time.Hour)
			s.Write("call-1", "msg-1", "final")
			if closeAll {
				s.CloseAll()
			} else {
				s.Close("call-1")
			}
		})
	}
}

func TestStreamerCloseAllFlushesConcurrently(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	var calls atomic.Int32
	bothStarted := make(chan struct{})
	m.EXPECT().AgentMessageOutput(mock.Anything, mock.Anything).RunAndReturn(
		func(ctx context.Context, _ console.AgentMessageOutputAttributes) error {
			if calls.Add(1) == 2 {
				close(bothStarted)
			}
			select {
			case <-bothStarted:
				return errors.New("unavailable")
			case <-ctx.Done():
				return ctx.Err()
			}
		},
	).Times(2)

	s := New(t.Context(), m).WithSizeLimit(1024).WithFlushInterval(time.Hour)
	s.flushTimeout = 500 * time.Millisecond
	s.Write("call-1", "msg-1", "one")
	s.Write("call-2", "msg-2", "two")

	start := time.Now()
	s.CloseAll()
	require.Less(t, time.Since(start), 300*time.Millisecond)
}

func TestStreamerCloseAllDoesNotRetryCanceledInFlightFlush(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	started := make(chan struct{})
	m.EXPECT().AgentMessageOutput(mock.Anything, mock.Anything).RunAndReturn(
		func(ctx context.Context, _ console.AgentMessageOutputAttributes) error {
			close(started)
			<-ctx.Done()
			return ctx.Err()
		},
	).Once()

	s := New(t.Context(), m).WithSizeLimit(4).WithFlushInterval(time.Hour)
	writeDone := make(chan struct{})
	go func() {
		s.Write("call-1", "msg-1", "data")
		close(writeDone)
	}()

	<-started
	s.CloseAll()
	<-writeDone
}

func TestStreamerFlushesOnContextCancel(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	done := make(chan struct{})
	m.On("AgentMessageOutput", mock.Anything, mock.MatchedBy(func(attrs console.AgentMessageOutputAttributes) bool {
		return attrs.MessageID == "msg-1" && attrs.Stdout != nil && *attrs.Stdout == "final"
	})).Run(func(args mock.Arguments) {
		ctx := args.Get(0).(context.Context)
		require.NoError(t, ctx.Err(), "final flush must not use the cancelled run context")
		close(done)
	}).Return(nil)

	ctx, cancel := context.WithCancel(t.Context())
	s := New(ctx, m).WithSizeLimit(1024).WithFlushInterval(time.Hour)
	s.Write("call-1", "msg-1", "final")
	cancel()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for cancel flush")
	}
	s.Close("call-1")
}

func TestStreamerDeliversStdoutWhenCloseRacesWithCancel(t *testing.T) {
	t.Parallel()

	for range 50 {
		m := mocks.NewClientMock(t)
		var got string
		var mu sync.Mutex
		m.On("AgentMessageOutput", mock.Anything, mock.MatchedBy(func(attrs console.AgentMessageOutputAttributes) bool {
			mu.Lock()
			defer mu.Unlock()
			if attrs.Stdout != nil {
				got += *attrs.Stdout
			}
			return attrs.MessageID == "msg-1"
		})).Return(nil)

		ctx, cancel := context.WithCancel(t.Context())
		s := New(ctx, m).WithSizeLimit(1024).WithFlushInterval(time.Hour)
		s.Write("call-1", "msg-1", "final")
		cancel()
		s.Close("call-1")

		mu.Lock()
		require.Equal(t, "final", got)
		mu.Unlock()
	}
}

func TestStreamerCancelsInFlightFlushWithRunContext(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	started := make(chan struct{})
	m.EXPECT().AgentMessageOutput(mock.Anything, mock.Anything).RunAndReturn(
		func(ctx context.Context, _ console.AgentMessageOutputAttributes) error {
			close(started)
			<-ctx.Done()
			return ctx.Err()
		},
	).Once()

	ctx, cancel := context.WithCancel(t.Context())
	s := New(ctx, m).WithSizeLimit(4).WithFlushInterval(time.Hour)
	writeDone := make(chan struct{})
	go func() {
		s.Write("call-1", "msg-1", "data")
		close(writeDone)
	}()

	<-started
	cancel()
	select {
	case <-writeDone:
	case <-time.After(time.Second):
		t.Fatal("in-flight flush did not stop after run cancellation")
	}
	s.Close("call-1")
}

func TestStreamerIgnoresWritesAfterClose(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("AgentMessageOutput", mock.Anything, mock.MatchedBy(func(attrs console.AgentMessageOutputAttributes) bool {
		return attrs.MessageID == "msg-1" &&
			attrs.Stdout != nil &&
			*attrs.Stdout == "done"
	})).Return(nil).Once()

	s := New(t.Context(), m).WithSizeLimit(1024).WithFlushInterval(time.Hour)
	s.Write("call-1", "msg-1", "done")
	s.Close("call-1")
	s.Write("call-1", "msg-1", "done too late")

	// Closing an already closed stream must stay a no-op.
	s.Close("call-1")
	s.CloseAll()
}

func TestStreamerIgnoresRegressedAccumulatedStdout(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	var got string
	m.On("AgentMessageOutput", mock.Anything, mock.MatchedBy(func(attrs console.AgentMessageOutputAttributes) bool {
		if attrs.Stdout != nil {
			got += *attrs.Stdout
		}
		return attrs.MessageID == "msg-1"
	})).Return(nil)

	s := New(t.Context(), m).WithSizeLimit(5).WithFlushInterval(time.Hour)
	s.Write("call-1", "msg-1", "hello")
	s.Write("call-1", "msg-1", "hi")
	s.Write("call-1", "msg-1", "hello!")
	s.Close("call-1")

	require.Equal(t, "hello!", got)
}

func TestStreamerDeltasFromGrowingAccumulatedStdout(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	var got string
	var mu sync.Mutex
	m.On("AgentMessageOutput", mock.Anything, mock.MatchedBy(func(attrs console.AgentMessageOutputAttributes) bool {
		mu.Lock()
		defer mu.Unlock()
		if attrs.Stdout != nil {
			got += *attrs.Stdout
		}
		return attrs.MessageID == "msg-1"
	})).Return(nil)

	s := New(t.Context(), m).WithSizeLimit(64).WithFlushInterval(time.Hour)
	var acc string
	for i := 0; i < 50; i++ {
		acc += "x"
		s.Write("call-1", "msg-1", acc)
	}
	s.Close("call-1")

	mu.Lock()
	defer mu.Unlock()
	require.Equal(t, acc, got)
}
