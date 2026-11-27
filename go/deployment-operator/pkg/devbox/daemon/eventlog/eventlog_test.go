package eventlog

import (
	"context"
	"errors"
	"os/signal"
	"strings"
	"syscall"
	"testing"
	"time"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

func cond(msg string) *devboxv1.DaemonEvent {
	return &devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_Condition{Condition: &devboxv1.DaemonCondition{Type: "test", Message: msg}}}
}

var errStop = errors.New("stop")

// collect subscribes from `from` and returns the offsets of the first n events.
func collect(t *testing.T, l *Log, from uint64, n int) []uint64 {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var got []uint64
	err := l.Subscribe(ctx, from, func(ev *devboxv1.DaemonEvent) error {
		got = append(got, ev.GetOffset())
		if len(got) == n {
			return errStop
		}
		return nil
	})
	if !errors.Is(err, errStop) {
		t.Fatalf("subscribe from %d: %v (got %v)", from, err, got)
	}
	return got
}

func equal(a, b []uint64) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestOffsetsAckReplay(t *testing.T) {
	dir := t.TempDir()
	l, err := Open(dir, WithSegmentBytes(64))
	if err != nil {
		t.Fatal(err)
	}
	for i := 1; i <= 5; i++ {
		off, err := l.Append(cond("e"))
		if err != nil || off != uint64(i) {
			t.Fatalf("append %d: offset %d err %v", i, off, err)
		}
	}
	if got := collect(t, l, 2, 3); !equal(got, []uint64{3, 4, 5}) {
		t.Fatalf("replay from 2: %v", got)
	}

	// Live follow: a subscriber at the head sees new appends.
	done := make(chan []uint64)
	go func() { done <- collect(t, l, 5, 2) }()
	time.Sleep(50 * time.Millisecond)
	_, _ = l.Append(cond("live1"))
	_, _ = l.Append(cond("live2"))
	if got := <-done; !equal(got, []uint64{6, 7}) {
		t.Fatalf("live: %v", got)
	}

	if acked, err := l.Ack(3); err != nil || acked != 3 {
		t.Fatalf("ack: %d %v", acked, err)
	}
	if acked, _ := l.Ack(2); acked != 3 {
		t.Fatalf("ack went backwards: %d", acked)
	}
	if acked, _ := l.Ack(100); acked != 7 {
		t.Fatalf("ack beyond head not clamped: %d", acked)
	}
	if _, err := l.Ack(3); err != nil {
		t.Fatal(err)
	}
	if err := l.Close(); err != nil {
		t.Fatal(err)
	}

	// Reopen: offsets and the ack survive; trimmed records are skipped.
	l, err = Open(dir, WithSegmentBytes(64))
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	if l.Head() != 7 || l.Acked() != 7 {
		t.Fatalf("after reopen head=%d acked=%d", l.Head(), l.Acked())
	}
	off, _ := l.Append(cond("after"))
	if off != 8 {
		t.Fatalf("offset after reopen %d", off)
	}
	if got := collect(t, l, 0, 1); got[0] < 4 {
		t.Fatalf("acknowledged records not trimmed: first replayed %v", got)
	}
	ev := cond("delta")
	if got := collect(t, l, 7, 1); !equal(got, []uint64{8}) {
		t.Fatalf("replay from 7: %v", got)
	}
	_ = ev
}

func TestResetKeepsOffsetsMonotonic(t *testing.T) {
	l, err := Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	for range 3 {
		_, _ = l.Append(cond("old"))
	}
	if err := l.Reset(); err != nil {
		t.Fatal(err)
	}
	if l.Acked() != 3 {
		t.Fatalf("reset ack %d", l.Acked())
	}
	off, _ := l.Append(cond("new"))
	if off != 4 {
		t.Fatalf("offset after reset %d", off)
	}
	if got := collect(t, l, 0, 1); !equal(got, []uint64{4}) {
		t.Fatalf("old instance's records replayed: %v", got)
	}
}

func TestHeadDoesNotWaitForDiskWork(t *testing.T) {
	dir := t.TempDir()
	l, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	for range 2 {
		_, _ = l.Append(cond("x"))
	}
	l.Close()
	if l, err = Open(dir); err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	if l.Head() != 2 {
		t.Fatalf("recovered head %d", l.Head())
	}

	l.mu.Lock() // a Sync or Append stuck in fsync on a hung home
	got := make(chan uint64, 1)
	go func() { got <- l.Head() }()
	select {
	case h := <-got:
		if h != 2 {
			t.Fatalf("head %d", h)
		}
	case <-time.After(time.Second):
		t.Fatal("Head waited for the log lock")
	}
	l.mu.Unlock()
}

func TestFailedAppendLeavesNoTornRecord(t *testing.T) {
	dir := t.TempDir()
	l, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := l.Append(cond("ok")); err != nil {
		t.Fatal(err)
	}
	size := l.segments[0].size

	// Cap the file size just past the first record so the next append is a short write, like ENOSPC.
	signal.Ignore(syscall.SIGXFSZ)
	defer signal.Reset(syscall.SIGXFSZ)
	var old syscall.Rlimit
	if err := syscall.Getrlimit(syscall.RLIMIT_FSIZE, &old); err != nil {
		t.Fatal(err)
	}
	lim := old
	lim.Cur = uint64(size) + 8
	if err := syscall.Setrlimit(syscall.RLIMIT_FSIZE, &lim); err != nil {
		t.Fatal(err)
	}
	_, appendErr := l.Append(cond(strings.Repeat("x", 64)))
	if err := syscall.Setrlimit(syscall.RLIMIT_FSIZE, &old); err != nil {
		t.Fatal(err)
	}
	if appendErr == nil {
		t.Fatal("append past the file size limit succeeded")
	}

	off, err := l.Append(cond("after"))
	if err != nil || off != 2 {
		t.Fatalf("append after failure: offset %d err %v", off, err)
	}
	if got := collect(t, l, 0, 2); !equal(got, []uint64{1, 2}) {
		t.Fatalf("replay after failed append: %v", got)
	}
	l.Close()
	if l, err = Open(dir); err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	if l.Head() != 2 {
		t.Fatalf("recovered head %d", l.Head())
	}
}

func TestDeltaOffsetStamped(t *testing.T) {
	l, err := Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	ev := &devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_Delta{Delta: &devboxv1.Delta{SessionId: "s"}}}
	off, _ := l.Append(ev)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	_ = l.Subscribe(ctx, 0, func(got *devboxv1.DaemonEvent) error {
		if got.GetDelta().GetOffset() != off || got.GetEmittedAt() == nil {
			t.Fatalf("delta not stamped: %v", got)
		}
		return errStop
	})
}
