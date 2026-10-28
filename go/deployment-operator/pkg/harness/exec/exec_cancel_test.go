package exec

import (
	"bytes"
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

var errTestCancel = errors.New("remote cancel")

type syncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *syncBuffer) Close() error { return nil }

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

func runAndCancel(t *testing.T, exe Executable) (error, time.Duration) {
	t.Helper()

	ctx, cancel := context.WithCancelCause(context.Background())
	done := make(chan error, 1)
	go func() { done <- exe.Run(ctx) }()

	time.Sleep(500 * time.Millisecond)
	start := time.Now()
	cancel(errTestCancel)

	select {
	case err := <-done:
		return err, time.Since(start)
	case <-time.After(10 * time.Second):
		t.Fatal("in-flight command did not stop after cancellation")
		return nil, 0
	}
}

func TestRunInterruptsInFlightCommandOnCancel(t *testing.T) {
	out := &syncBuffer{}
	exe := NewExecutable("sh",
		WithArgs([]string{"-c", `trap 'echo interrupted; exit 130' INT; while true; do sleep 0.1; done`}),
		WithOutputSinks(out),
	)

	err, _ := runAndCancel(t, exe)

	require.ErrorIs(t, err, errTestCancel)
	require.Contains(t, out.String(), "interrupted")
}

func TestRunKillsCommandIgnoringInterruptAfterGracePeriod(t *testing.T) {
	exe := NewExecutable("sh",
		WithArgs([]string{"-c", `trap '' INT; while true; do sleep 0.1; done`}),
		WithCancelGracePeriod(200*time.Millisecond),
	)

	err, elapsed := runAndCancel(t, exe)

	require.ErrorIs(t, err, errTestCancel)
	require.Less(t, elapsed, 5*time.Second)
}
