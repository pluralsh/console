// Package python executes the user-provided Python used by Helm value
// templating.
//
// Scripts run in a fresh Gomonty REPL for every job. The package deliberately
// does not provide any Gomonty host callbacks, so scripts cannot access the
// operator process, filesystem, network, or environment.
package python

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"time"

	monty "github.com/ewhauser/gomonty"
)

const (
	// ExecutionTimeout bounds queue admission and execution for one job.
	ExecutionTimeout = 10 * time.Second
	maxMemoryBytes   = 100 << 20
	maxRecursion     = 100
)

// Config controls a Pool. WorkerCount and QueueSize are intended primarily
// for focused tests. Production callers should set MaxConcurrentReconciles so
// the fixed pool sizing policy is applied at startup.
type Config struct {
	MaxConcurrentReconciles int
	WorkerCount             int
	QueueSize               int
	ExecutionTimeout        time.Duration
}

// Result is the strict shape returned by a Python templating script.
type Result struct {
	Values      map[string]any
	ValuesFiles []string
}

// Pool owns a fixed set of workers and a bounded queue. It is safe for
// concurrent use. Close waits for workers to stop and is idempotent.
type Pool struct {
	jobs chan job
	done chan struct{}

	poolCtx    context.Context
	poolCancel context.CancelFunc

	mu     sync.RWMutex
	closed bool
	wg     sync.WaitGroup

	timeout time.Duration
}

var defaultPool struct {
	sync.RWMutex
	pool *Pool
}

var syntaxByteRange = regexp.MustCompile(`byte range ([0-9]+)\.\.([0-9]+)$`)

type job struct {
	ctx      context.Context
	script   string
	bindings map[string]any
	result   chan jobResult
}

type jobResult struct {
	result Result
	err    error
}

// NewPool creates and health-checks a fixed-size worker pool. The health check
// eagerly loads Gomonty's native runtime, making startup failures visible
// before the first service render.
func NewPool(maxConcurrentReconciles int) (*Pool, error) {
	return NewPoolWithConfig(Config{MaxConcurrentReconciles: maxConcurrentReconciles})
}

// NewPoolWithConfig is the configurable constructor used by tests and by
// callers that need to provide an explicit pool size.
func NewPoolWithConfig(config Config) (*Pool, error) {
	workers := config.workerCount()
	if workers <= 0 {
		workers = 1
	}

	queueSize := config.QueueSize
	if queueSize <= 0 {
		queueSize = workers
	}
	if queueSize <= 0 {
		queueSize = 1
	}

	timeout := config.ExecutionTimeout
	if timeout <= 0 {
		timeout = ExecutionTimeout
	}

	poolCtx, poolCancel := context.WithCancel(context.Background())
	p := &Pool{
		jobs:       make(chan job, queueSize),
		done:       make(chan struct{}),
		poolCtx:    poolCtx,
		poolCancel: poolCancel,
		timeout:    timeout,
	}

	if err := p.healthCheck(); err != nil {
		poolCancel()
		return nil, err
	}

	p.wg.Add(workers)
	for range workers {
		go p.worker()
	}
	return p, nil
}

// SetDefaultPool installs the process-wide pool used by Helm rendering. The
// caller owns the pool and must close it during application shutdown.
func SetDefaultPool(pool *Pool) {
	defaultPool.Lock()
	defaultPool.pool = pool
	defaultPool.Unlock()
}

// DefaultPool returns the pool installed by the application startup path.
func DefaultPool() *Pool {
	defaultPool.RLock()
	defer defaultPool.RUnlock()
	return defaultPool.pool
}

func (config Config) workerCount() int {
	if config.WorkerCount > 0 {
		return config.WorkerCount
	}
	maxConcurrentReconciles := config.MaxConcurrentReconciles
	if maxConcurrentReconciles <= 0 {
		return 1
	}
	parallelism := max(runtime.GOMAXPROCS(0)*2, 4)
	if maxConcurrentReconciles < parallelism {
		return maxConcurrentReconciles
	}
	return parallelism
}

// Run submits one script to the bounded pool. The timeout starts before queue
// admission, so a queued job cannot extend the caller's end-to-end deadline.
func (p *Pool) Run(ctx context.Context, script string, bindings map[string]any) (Result, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()

	p.mu.RLock()
	closed := p.closed
	p.mu.RUnlock()
	if closed {
		return Result{}, errors.New("python pool is closed")
	}

	request := job{
		ctx:      ctx,
		script:   script,
		bindings: bindings,
		result:   make(chan jobResult, 1),
	}

	select {
	case p.jobs <- request:
	case <-ctx.Done():
		return Result{}, ctx.Err()
	case <-p.done:
		return Result{}, errors.New("python pool is closed")
	}

	select {
	case output := <-request.result:
		return output.result, output.err
	case <-ctx.Done():
		return Result{}, ctx.Err()
	case <-p.done:
		return Result{}, errors.New("python pool is closed")
	}
}

// Close stops accepting work, cancels executing jobs, and waits for all
// workers. Jobs that have not started are discarded with the pool.
func (p *Pool) Close() error {
	if p == nil {
		return nil
	}
	p.mu.Lock()
	if !p.closed {
		p.closed = true
		p.poolCancel()
		close(p.done)
	}
	p.mu.Unlock()
	p.wg.Wait()
	return nil
}

func (p *Pool) worker() {
	defer p.wg.Done()
	for {
		select {
		case <-p.done:
			return
		case request := <-p.jobs:
			select {
			case <-p.done:
				return
			default:
			}

			result, err := p.execute(request.ctx, request.script, request.bindings)
			request.result <- jobResult{result: result, err: err}
		}
	}
}

func (p *Pool) healthCheck() error {
	// Small execution limits are useful in tests, but startup still needs enough
	// time to load the native runtime under slow or instrumented environments.
	timeout := max(p.timeout, time.Second)
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	limits := p.limits()
	limits.MaxDuration = timeout
	repl, err := monty.NewRepl(monty.ReplOptions{
		ScriptName: "helm-values.py",
		Limits:     limits,
	})
	if err != nil {
		return fmt.Errorf("initialize Python runtime: %w", err)
	}
	if _, err := repl.FeedRun(ctx, "1", monty.FeedOptions{}); err != nil {
		return fmt.Errorf("health-check Python runtime: %w", err)
	}
	return nil
}

func (p *Pool) execute(parentCtx context.Context, script string, bindings map[string]any) (Result, error) {
	ctx, cancel := context.WithTimeout(parentCtx, p.timeout)
	defer cancel()
	stopPoolCancel := context.AfterFunc(p.poolCtx, cancel)
	defer stopPoolCancel()

	if bindings == nil {
		bindings = map[string]any{}
	}
	bindingsJSON, err := json.Marshal(bindings)
	if err != nil {
		return Result{}, fmt.Errorf("serialize Python bindings: %w", err)
	}

	repl, err := monty.NewRepl(monty.ReplOptions{
		ScriptName: "helm-values.py",
		Limits:     p.limits(),
	})
	if err != nil {
		return Result{}, fmt.Errorf("create Python REPL: %w", err)
	}

	quotedBindings, err := json.Marshal(string(bindingsJSON))
	if err != nil {
		return Result{}, fmt.Errorf("serialize Python bindings: %w", err)
	}

	initialization := "import json as __helm_json\n" +
		"__helm_bindings = __helm_json.loads(" + string(quotedBindings) + ")\n" +
		"configuration = __helm_bindings.get('configuration')\n" +
		"cluster = __helm_bindings.get('cluster')\n" +
		"contexts = __helm_bindings.get('contexts')\n" +
		"imports = __helm_bindings.get('imports')\n" +
		"service = __helm_bindings.get('service')\n" +
		"values = {}\n" +
		"valuesFiles = []\n"
	if _, err := repl.FeedRun(ctx, initialization, monty.FeedOptions{}); err != nil {
		return Result{}, p.mapExecutionError(ctx, err)
	}
	if _, err := repl.FeedRun(ctx, script, monty.FeedOptions{}); err != nil {
		return Result{}, p.mapExecutionError(ctx, err)
	}

	encoded, err := repl.FeedRun(ctx, "__helm_json.dumps({'values': values, 'valuesFiles': valuesFiles})", monty.FeedOptions{})
	if err != nil {
		return Result{}, p.mapExecutionError(ctx, err)
	}
	raw, ok := encoded.Raw().(string)
	if !ok {
		return Result{}, errors.New("python result is not JSON")
	}

	var decoded map[string]json.RawMessage
	if err := json.Unmarshal([]byte(raw), &decoded); err != nil {
		return Result{}, fmt.Errorf("decode Python result: %w", err)
	}

	var values map[string]any
	if err := json.Unmarshal(decoded["values"], &values); err != nil || values == nil {
		return Result{}, errors.New("python values must be a dictionary")
	}
	var valuesFiles []string
	if err := json.Unmarshal(decoded["valuesFiles"], &valuesFiles); err != nil || valuesFiles == nil {
		return Result{}, errors.New("python valuesFiles must be a list of strings")
	}

	return Result{Values: values, ValuesFiles: valuesFiles}, nil
}

func (p *Pool) limits() *monty.ResourceLimits {
	return &monty.ResourceLimits{
		MaxDuration:       p.timeout,
		MaxMemory:         maxMemoryBytes,
		MaxRecursionDepth: maxRecursion,
	}
}

func (p *Pool) mapExecutionError(ctx context.Context, err error) error {
	if ctxErr := ctx.Err(); ctxErr != nil {
		return ctxErr
	}
	if err == nil {
		return nil
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return err
	}

	var syntax *monty.SyntaxError
	if errors.As(err, &syntax) {
		if match := syntaxByteRange.FindStringSubmatch(syntax.Error()); len(match) == 3 {
			return fmt.Errorf("python SyntaxError at helm-values.py bytes %s..%s", match[1], match[2])
		}
		return errors.New("python SyntaxError")
	}
	var runtimeErr *monty.RuntimeError
	if errors.As(err, &runtimeErr) {
		kind, _, _ := strings.Cut(runtimeErr.Error(), ":")
		kind = strings.TrimSpace(kind)
		if kind == "" {
			kind = "RuntimeError"
		}
		for _, char := range kind {
			if (char < 'a' || char > 'z') && (char < 'A' || char > 'Z') && (char < '0' || char > '9') && char != '_' {
				kind = "RuntimeError"
				break
			}
		}
		deadline := kind == "TimeoutError" || kind == "ResourceError"
		if len(runtimeErr.Frames) == 0 {
			if deadline {
				return fmt.Errorf("python %s: %w", kind, context.DeadlineExceeded)
			}
			return fmt.Errorf("python %s", kind)
		}
		frame := runtimeErr.Frames[0]
		if deadline {
			return fmt.Errorf("python %s at helm-values.py:%d:%d: %w", kind, frame.Line, frame.Column, context.DeadlineExceeded)
		}
		return fmt.Errorf("python %s at helm-values.py:%d:%d", kind, frame.Line, frame.Column)
	}
	return errors.New("python execution failed")
}
