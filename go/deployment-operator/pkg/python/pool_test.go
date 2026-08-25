package python

import (
	"context"
	"errors"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"
)

func testPool(t *testing.T, config Config) *Pool {
	t.Helper()
	p, err := NewPoolWithConfig(config)
	if err != nil {
		t.Fatalf("NewPoolWithConfig: %v", err)
	}
	t.Cleanup(func() {
		if err := p.Close(); err != nil {
			t.Errorf("Close: %v", err)
		}
	})
	return p
}

func TestRunConvertsValuesAndBindings(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 2, QueueSize: 2})

	result, err := p.Run(context.Background(), `
values["name"] = configuration["name"]
values["version"] = cluster["version"]
values["enabled"] = contexts["deploy"]["enabled"]
valuesFiles.append("first.yaml")
`, map[string]any{
		"configuration": map[string]any{"name": "service"},
		"cluster":       map[string]any{"version": "1.2.3"},
		"contexts":      map[string]any{"deploy": map[string]any{"enabled": true}},
		"imports":       map[string]any{},
		"service":       map[string]any{},
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if result.Values["name"] != "service" || result.Values["version"] != "1.2.3" || result.Values["enabled"] != true {
		t.Fatalf("unexpected values: %#v", result.Values)
	}
	if len(result.ValuesFiles) != 1 || result.ValuesFiles[0] != "first.yaml" {
		t.Fatalf("unexpected valuesFiles: %#v", result.ValuesFiles)
	}
}

func TestRunUsesFreshState(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 2})

	first, err := p.Run(context.Background(), `
def leaked():
    return 7
values["name"] = "first"
`, nil)
	if err != nil {
		t.Fatalf("first Run: %v", err)
	}
	if first.Values["name"] != "first" {
		t.Fatalf("unexpected first result: %#v", first.Values)
	}
	_, err = p.Run(context.Background(), `values["name"] = leaked()`, nil)
	if err == nil || !strings.Contains(err.Error(), "LookupError") {
		t.Fatalf("expected leaked state to be unavailable, got %v", err)
	}
	second, err := p.Run(context.Background(), `values["name"] = "second"`, nil)
	if err != nil {
		t.Fatalf("second successful Run: %v", err)
	}
	if second.Values["name"] != "second" {
		t.Fatalf("unexpected second result: %#v", second.Values)
	}
}

func TestConfigWorkerCountFormula(t *testing.T) {
	previous := runtime.GOMAXPROCS(1)
	t.Cleanup(func() { runtime.GOMAXPROCS(previous) })

	if got := (Config{}).workerCount(); got != 1 {
		t.Fatalf("Config{}.workerCount() = %d, want 1", got)
	}
	if got := (Config{WorkerCount: 7}).workerCount(); got != 7 {
		t.Fatalf("Config{WorkerCount: 7}.workerCount() = %d, want 7", got)
	}
	if got := (Config{MaxConcurrentReconciles: 3}).workerCount(); got != 3 {
		t.Fatalf("Config{MaxConcurrentReconciles: 3}.workerCount() = %d, want 3", got)
	}
	if got := (Config{MaxConcurrentReconciles: 100}).workerCount(); got != 4 {
		t.Fatalf("Config{MaxConcurrentReconciles: 100}.workerCount() = %d, want 4 with one CPU", got)
	}

	runtime.GOMAXPROCS(3)
	if got := (Config{MaxConcurrentReconciles: 100}).workerCount(); got != 6 {
		t.Fatalf("Config{MaxConcurrentReconciles: 100}.workerCount() = %d, want 6 with three CPUs", got)
	}
}

func TestPoolDefaultQueueUsesCappedWorkerCount(t *testing.T) {
	previous := runtime.GOMAXPROCS(1)
	t.Cleanup(func() { runtime.GOMAXPROCS(previous) })

	p := testPool(t, Config{MaxConcurrentReconciles: 1_000_000})
	if got, want := cap(p.jobs), 4; got != want {
		t.Fatalf("default queue capacity = %d, want %d", got, want)
	}
}

func TestRunReportsScriptErrorsWithoutSource(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})

	for name, script := range map[string]string{
		"syntax":  `values[ = 1`,
		"runtime": `raise ValueError("boom")`,
	} {
		t.Run(name, func(t *testing.T) {
			_, err := p.Run(context.Background(), script, nil)
			if err == nil {
				t.Fatal("Run succeeded")
			}
			if !strings.Contains(err.Error(), "python") {
				t.Fatalf("error is not contextualized: %v", err)
			}
			if strings.Contains(err.Error(), script) {
				t.Fatalf("error leaked source: %v", err)
			}
		})
	}
}

func TestRunSyntaxErrorReportsSafeLocation(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})
	source := `values[ = "syntax-location-secret"`

	_, err := p.Run(context.Background(), source, nil)
	if err == nil {
		t.Fatal("Run succeeded")
	}
	if !strings.Contains(err.Error(), "python SyntaxError at helm-values.py bytes ") {
		t.Fatalf("error omitted safe syntax location: %v", err)
	}
	if strings.Contains(err.Error(), source) || strings.Contains(err.Error(), "syntax-location-secret") {
		t.Fatalf("error exposed syntax source: %v", err)
	}
}

func TestRunDoesNotExposeExceptionMessages(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})
	secret := "python-binding-secret-4d8c"

	_, err := p.Run(context.Background(), `raise ValueError(configuration["secret"])`, map[string]any{
		"configuration": map[string]any{"secret": secret},
	})
	if err == nil {
		t.Fatal("Run succeeded")
	}
	if strings.Contains(err.Error(), secret) {
		t.Fatalf("error exposed binding value: %v", err)
	}
	if !strings.Contains(err.Error(), "python ValueError") {
		t.Fatalf("error omitted exception type: %v", err)
	}
	if !strings.Contains(err.Error(), "helm-values.py:") {
		t.Fatalf("error omitted safe source location: %v", err)
	}
}

func TestRunRejectsNonStrictOutput(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})

	_, err := p.Run(context.Background(), `values = []`, nil)
	if err == nil || !strings.Contains(err.Error(), "dictionary") {
		t.Fatalf("expected strict values error, got %v", err)
	}
	_, err = p.Run(context.Background(), `valuesFiles = [1]`, nil)
	if err == nil || !strings.Contains(err.Error(), "valuesFiles") {
		t.Fatalf("expected strict valuesFiles error, got %v", err)
	}
}

func TestRunHonorsCancellation(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1, ExecutionTimeout: time.Second})

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := p.Run(ctx, `values["name"] = "never"`, nil)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context cancellation, got %v", err)
	}
}

func TestRunHonorsExecutionTimeout(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1, ExecutionTimeout: 10 * time.Millisecond})

	_, err := p.Run(context.Background(), `
while True:
    pass
`, nil)
	if err == nil {
		t.Fatal("expected execution timeout")
	}
}

func TestQueuedRunSharesExecutionBudget(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 2, ExecutionTimeout: 200 * time.Millisecond})

	firstDone := make(chan error, 1)
	go func() {
		_, err := p.Run(context.Background(), "while True:\n    pass", nil)
		firstDone <- err
	}()

	time.Sleep(10 * time.Millisecond)
	select {
	case err := <-firstDone:
		t.Fatalf("first job finished before the queued run: %v", err)
	default:
	}

	started := time.Now()
	_, err := p.Run(context.Background(), "while True:\n    pass", nil)
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("expected queued deadline, got %v", err)
	}
	if elapsed := time.Since(started); elapsed > 350*time.Millisecond {
		t.Fatalf("queued run exceeded bounded wait: %s", elapsed)
	}
	if err := <-firstDone; !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("expected first deadline, got %v", err)
	}
}

func TestCloseIsIdempotentDuringRuns(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 2, QueueSize: 4, ExecutionTimeout: time.Second})

	const runs = 6
	var runsWG sync.WaitGroup
	for range runs {
		runsWG.Go(func() {
			_, _ = p.Run(context.Background(), "while True:\n    pass", nil)
		})
	}
	time.Sleep(5 * time.Millisecond)

	var closeWG sync.WaitGroup
	for range 2 {
		closeWG.Go(func() {
			if err := p.Close(); err != nil {
				t.Errorf("Close: %v", err)
			}
		})
	}
	closeWG.Wait()
	runsWG.Wait()
}

func TestRunSupportsConcurrentJobs(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 2, QueueSize: 8})

	const jobs = 8
	errs := make(chan error, jobs)
	var wg sync.WaitGroup
	for range jobs {
		wg.Go(func() {
			result, err := p.Run(context.Background(), `values["ok"] = True`, nil)
			if err == nil && result.Values["ok"] != true {
				err = errors.New("unexpected result")
			}
			errs <- err
		})
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
}
