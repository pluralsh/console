package metering

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

type fakeClient struct {
	mu        sync.Mutex
	calls     []int64
	failFirst bool
}

func (f *fakeClient) MeterMetrics(_ context.Context, bytes int64) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.calls = append(f.calls, bytes)
	if f.failFirst {
		f.failFirst = false
		return errors.New("boom")
	}
	return nil
}

func (f *fakeClient) Calls() []int64 {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]int64, len(f.calls))
	copy(out, f.calls)
	return out
}

func TestFlushSendsAggregatedBytes(t *testing.T) {
	client := &fakeClient{}
	reporter := NewUsageReporter(client, time.Second)

	reporter.AddBytes(5)
	reporter.AddBytes(7)
	reporter.flush(context.Background())

	calls := client.Calls()
	if len(calls) != 1 {
		t.Fatalf("unexpected call count: got %d want 1", len(calls))
	}
	if calls[0] != 12 {
		t.Fatalf("unexpected metered bytes: got %d want 12", calls[0])
	}
}

func TestFlushRequeuesOnFailure(t *testing.T) {
	client := &fakeClient{failFirst: true}
	reporter := NewUsageReporter(client, time.Second)

	reporter.AddBytes(10)
	reporter.flush(context.Background())
	reporter.flush(context.Background())

	calls := client.Calls()
	if len(calls) != 2 {
		t.Fatalf("unexpected call count: got %d want 2", len(calls))
	}
	if calls[0] != 10 || calls[1] != 10 {
		t.Fatalf("unexpected metered bytes calls: got %v want [10 10]", calls)
	}
}

func TestStartFlushesOnStop(t *testing.T) {
	client := &fakeClient{}
	reporter := NewUsageReporter(client, 10*time.Second)
	reporter.AddBytes(9)

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		reporter.Start(ctx)
		close(done)
	}()

	cancel()

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("meter did not stop")
	}

	calls := client.Calls()
	if len(calls) != 1 || calls[0] != 9 {
		t.Fatalf("unexpected calls: got %v want [9]", calls)
	}
}
