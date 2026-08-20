package pool

import (
	"context"
	"errors"
	"fmt"
	"runtime"
	"sync"
	"testing"
	"time"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/contract"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/protocol"
)

type fakeProcess struct {
	id      int
	stopped bool
	mu      sync.Mutex
	seen    []string
	block   chan struct{}
}

func (p *fakeProcess) exchange(ctx context.Context, request protocol.Request) (protocol.Response, error) {
	p.mu.Lock()
	p.seen = append(p.seen, request.ID)
	p.mu.Unlock()
	if request.Kind == protocol.Health {
		return protocol.Response{Version: protocol.Version, Kind: request.Kind, ID: request.ID}, nil
	}
	if request.Script == "error" {
		return protocol.Response{
			Version: protocol.Version,
			Kind:    request.Kind,
			ID:      request.ID,
			Error: &protocol.WireError{
				Code:          contract.FailedPrecondition,
				PublicMessage: "python ValueError: bad value",
				Detail:        "private",
			},
		}, nil
	}
	if request.Script == "block" {
		select {
		case <-p.block:
		case <-ctx.Done():
			return protocol.Response{}, contract.ContextError(ctx.Err())
		}
	}
	return protocol.Response{
		Version:    protocol.Version,
		Kind:       request.Kind,
		ID:         request.ID,
		ResultJSON: fmt.Sprintf(`{"worker":%d}`, p.id),
	}, nil
}

func (p *fakeProcess) stop() {
	p.mu.Lock()
	p.stopped = true
	p.mu.Unlock()
}

type fakeFactory struct {
	mu        sync.Mutex
	processes []*fakeProcess
	failAt    int
}

type controlledProcess struct {
	started chan struct{}
	stopped chan struct{}
	once    sync.Once
}

func (p *controlledProcess) exchange(ctx context.Context, request protocol.Request) (protocol.Response, error) {
	if request.Kind == protocol.Health {
		return protocol.Response{Version: protocol.Version, Kind: request.Kind, ID: request.ID}, nil
	}
	select {
	case <-p.started:
	default:
		close(p.started)
	}
	select {
	case <-p.stopped:
		return protocol.Response{}, contract.InternalError(errors.New("process stopped"))
	case <-ctx.Done():
		return protocol.Response{}, contract.ContextError(ctx.Err())
	}
}

func (p *controlledProcess) stop() {
	p.once.Do(func() { close(p.stopped) })
}

func (f *fakeFactory) count() int {
	f.mu.Lock()
	defer f.mu.Unlock()

	return len(f.processes)
}

func (f *fakeFactory) new(ProcessConfig) (process, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.failAt > 0 && len(f.processes)+1 == f.failAt {
		return nil, errors.New("start failed")
	}
	p := &fakeProcess{id: len(f.processes) + 1, block: make(chan struct{})}
	f.processes = append(f.processes, p)
	return p, nil
}

func testConfig() Config {
	return Config{
		Workers:                        1,
		QueueSize:                      1,
		MaxSuccessfulRunsBeforeRecycle: 2,
		Process: ProcessConfig{
			Executable:  "fake",
			Arguments:   []string{"python-worker"},
			Environment: []string{"TMPDIR=/tmp"},
		},
	}
}

func TestPoolStartupRecycleAndRemoteFailure(t *testing.T) {
	factory := &fakeFactory{}
	runner, err := newRunner(context.Background(), testConfig(), factory.new)
	if err != nil {
		t.Fatal(err)
	}
	defer runner.CloseContext(context.Background())

	first, err := runner.Run(context.Background(), contract.RunInput{Script: "ok"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := runner.Run(context.Background(), contract.RunInput{Script: "ok"}); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(time.Second)
	for factory.count() < 2 && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	third, err := runner.Run(context.Background(), contract.RunInput{Script: "ok"})
	if err != nil || third.ResultJSON == first.ResultJSON {
		t.Fatalf("recycle: %#v %v", third, err)
	}
	if _, err := runner.Run(context.Background(), contract.RunInput{Script: "error"}); contract.CodeOf(err) != contract.FailedPrecondition {
		t.Fatalf("remote error: %v", err)
	}
}

func TestPoolFailsEagerStartupAndRejectsAfterClose(t *testing.T) {
	factory := &fakeFactory{failAt: 2}
	config := Config{
		Workers:                        2,
		QueueSize:                      1,
		MaxSuccessfulRunsBeforeRecycle: 1,
		Process: ProcessConfig{
			Executable:  "fake",
			Arguments:   []string{"python-worker"},
			Environment: []string{"TMPDIR=/tmp"},
		},
	}
	if _, err := newRunner(context.Background(), config, factory.new); contract.CodeOf(err) != contract.Unavailable {
		t.Fatalf("startup: %v", err)
	}
	runner, err := newRunner(context.Background(), testConfig(), (&fakeFactory{}).new)
	if err != nil {
		t.Fatal(err)
	}
	if err := runner.CloseContext(context.Background()); err != nil {
		t.Fatal(err)
	}
	if _, err := runner.Run(context.Background(), contract.RunInput{Script: "ok"}); contract.CodeOf(err) != contract.Unavailable {
		t.Fatalf("admission: %v", err)
	}
}

func TestRunCancellationRetiresActiveProcess(t *testing.T) {
	proc := &controlledProcess{started: make(chan struct{}), stopped: make(chan struct{})}
	runner, err := newRunner(context.Background(), testConfig(), func(ProcessConfig) (process, error) { return proc, nil })
	if err != nil {
		t.Fatal(err)
	}
	defer runner.CloseContext(context.Background())
	ctx, cancel := context.WithCancel(context.Background())
	result := make(chan error, 1)
	go func() { _, err := runner.Run(ctx, contract.RunInput{Script: "block"}); result <- err }()
	<-proc.started
	cancel()
	if err := <-result; contract.CodeOf(err) != contract.Canceled {
		t.Fatalf("cancellation = %v", err)
	}
	select {
	case <-proc.stopped:
	case <-time.After(time.Second):
		t.Fatal("active process was not stopped")
	}
}

func TestCloseDeadlineStopsActiveProcessAndDrainsQueue(t *testing.T) {
	proc := &controlledProcess{started: make(chan struct{}), stopped: make(chan struct{})}
	runner, err := newRunner(context.Background(), testConfig(), func(ProcessConfig) (process, error) { return proc, nil })
	if err != nil {
		t.Fatal(err)
	}
	active := make(chan error, 1)
	go func() { _, err := runner.Run(context.Background(), contract.RunInput{Script: "block"}); active <- err }()
	<-proc.started
	queued := make(chan result, 1)
	runner.jobs <- job{ctx: context.Background(), input: contract.RunInput{Script: "queued"}, response: queued}
	deadline, cancel := context.WithTimeout(context.Background(), time.Millisecond)
	defer cancel()
	if err := runner.CloseContext(deadline); !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("close = %v", err)
	}
	if answer := <-queued; contract.CodeOf(answer.err) != contract.Unavailable {
		t.Fatalf("queued = %v", answer.err)
	}
	if err := <-active; contract.CodeOf(err) != contract.Internal {
		t.Fatalf("active = %v", err)
	}
	if _, err := runner.Run(context.Background(), contract.RunInput{Script: "later"}); contract.CodeOf(err) != contract.Unavailable {
		t.Fatalf("admission = %v", err)
	}
}

func TestReplacementRetriesUntilCapacityRecovers(t *testing.T) {
	var mu sync.Mutex
	attempts := 0
	processes := make(chan *fakeProcess, 4)
	factory := func(ProcessConfig) (process, error) {
		mu.Lock()
		defer mu.Unlock()
		attempts++
		if attempts > 1 && attempts < 4 {
			return nil, errors.New("replacement failed")
		}

		process := &fakeProcess{id: attempts, block: make(chan struct{})}
		processes <- process
		return process, nil
	}

	runner, err := newRunner(context.Background(), testConfig(), factory)
	if err != nil {
		t.Fatal(err)
	}
	defer runner.CloseContext(context.Background())
	<-processes
	runner.retry = func() <-chan time.Time { ready := make(chan time.Time); close(ready); return ready }
	if _, err := runner.Run(context.Background(), contract.RunInput{Script: "error"}); contract.CodeOf(err) != contract.FailedPrecondition {
		t.Fatalf("run = %v", err)
	}
	<-processes
	waitForCapacity(t, runner)
	if _, err := runner.Run(context.Background(), contract.RunInput{Script: "ok"}); err != nil {
		t.Fatalf("recovered = %v", err)
	}
	mu.Lock()
	got := attempts
	mu.Unlock()
	if got != 4 {
		t.Fatalf("replacement attempts = %d, want 4", got)
	}
}

func waitForCapacity(t *testing.T, runner *Runner) {
	t.Helper()
	for range 100_000 {
		runner.mu.Lock()
		ready := len(runner.processes) > 0
		runner.mu.Unlock()
		if ready {
			return
		}
		runtime.Gosched()
	}
	t.Fatal("replacement did not restore capacity")
}
