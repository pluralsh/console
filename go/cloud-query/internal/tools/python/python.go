// Package python runs Monty in crash-isolated self-spawned workers.
package python

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

const (
	MaxSourceBytes = 64 << 10
	MaxInputBytes  = 1 << 20
	MaxResultBytes = 1 << 20
	MaxStdoutBytes = 64 << 10

	defaultWorkers      = 4
	defaultQueueSize    = 16
	maxCheckouts        = 10
	executionTimeout    = 10 * time.Second
	wallTimeout         = 15 * time.Second
	maxMemoryBytes      = 64 << 20
	maxRecursionDepth   = 200
	maxProtocolFrameLen = MaxInputBytes + MaxSourceBytes + MaxResultBytes + MaxStdoutBytes
)

type RunInput struct{ Script, InputJSON string }
type RunOutput struct{ ResultJSON, Stdout string }

// Config controls the parent pool. Zero numeric fields use the package defaults.
type Config struct {
	Workers           int
	QueueSize         int
	MaxSuccessfulRuns int
	Executable        string
	Arguments         []string
}

type Option func(*Config)

// WithBinaryPath remains available for tests. Production defaults to the
// current executable, which must dispatch python-worker to RunWorker.
func WithBinaryPath(path string) Option { return func(c *Config) { c.Executable = path } }
func withArguments(arguments ...string) Option {
	return func(c *Config) { c.Arguments = append([]string(nil), arguments...) }
}
func WithConfig(config Config) Option { return func(c *Config) { *c = config } }

type job struct {
	ctx      context.Context
	input    RunInput
	response chan runResult
}
type runResult struct {
	output *RunOutput
	err    error
}

type Runner struct {
	config     Config
	jobs       chan *job
	mu         sync.Mutex
	closed     bool
	healthy    int
	workers    map[*childWorker]struct{}
	workerWG   sync.WaitGroup
	replaceWG  sync.WaitGroup
	closeOnce  sync.Once
	closedDone chan struct{}
}

func New(ctx context.Context, options ...Option) (*Runner, error) {
	executable, err := os.Executable()
	if err != nil {
		return nil, &Error{Code: Unavailable, Msg: runtimeUnavailableMessage}
	}
	cfg := Config{Workers: defaultWorkers, QueueSize: defaultQueueSize, MaxSuccessfulRuns: maxCheckouts, Executable: executable, Arguments: []string{"python-worker"}}
	for _, option := range options {
		option(&cfg)
	}
	if cfg.Workers == 0 {
		cfg.Workers = defaultWorkers
	}
	if cfg.QueueSize == 0 {
		cfg.QueueSize = defaultQueueSize
	}
	if cfg.MaxSuccessfulRuns == 0 {
		cfg.MaxSuccessfulRuns = maxCheckouts
	}
	if cfg.Executable == "" {
		cfg.Executable = executable
	}
	if cfg.Arguments == nil {
		cfg.Arguments = []string{"python-worker"}
	}
	if cfg.Workers <= 0 || cfg.QueueSize < 0 || cfg.MaxSuccessfulRuns <= 0 || strings.TrimSpace(cfg.Executable) == "" {
		return nil, &Error{Code: Unavailable, Msg: runtimeUnavailableMessage}
	}
	r := &Runner{config: cfg, jobs: make(chan *job, cfg.QueueSize), workers: make(map[*childWorker]struct{}), closedDone: make(chan struct{})}
	for range cfg.Workers {
		if err := r.startWorker(ctx); err != nil {
			r.Close()
			return nil, &Error{Code: Unavailable, Msg: runtimeUnavailableMessage}
		}
	}
	return r, nil
}

func (r *Runner) startWorker(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, wallTimeout)
	defer cancel()

	w, err := r.newWorker()
	if err != nil {
		return err
	}
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		w.stop()
		return fmt.Errorf("runner is closed")
	}
	r.workers[w] = struct{}{}
	r.mu.Unlock()
	healthy := false
	defer func() {
		if healthy {
			return
		}
		w.stop()
		r.mu.Lock()
		delete(r.workers, w)
		r.mu.Unlock()
	}()

	response, err := w.exchange(ctx, protocolRequest{Version: protocolVersion, Type: requestHealth, ID: requestHealth})
	if err != nil || response.Code != "" {
		return fmt.Errorf("unhealthy worker")
	}
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		return fmt.Errorf("runner is closed")
	}
	r.healthy++
	r.workerWG.Add(1)
	healthy = true
	r.mu.Unlock()
	go r.serveWorker(w)
	return nil
}

func (r *Runner) newWorker() (*childWorker, error) {
	cmd := exec.Command(r.config.Executable, r.config.Arguments...)
	cmd.Env = []string{"TMPDIR=/tmp"}
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	w := &childWorker{stdin: stdin, stdout: stdout}
	w.kill = func() {
		_ = stdin.Close()
		_ = stdout.Close()
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		_ = cmd.Wait()
	}
	return w, nil
}

func (r *Runner) serveWorker(w *childWorker) {
	defer r.workerWG.Done()
	defer func() {
		w.stop()
		r.mu.Lock()
		delete(r.workers, w)
		r.healthy--
		closed := r.closed
		if !closed {
			r.replaceWG.Add(1)
		}
		r.mu.Unlock()
		if !closed {
			go func() {
				defer r.replaceWG.Done()
				r.replaceWorker()
			}()
		}
	}()
	successes := 0
	for request := range r.jobs {
		if err := request.ctx.Err(); err != nil {
			request.response <- runResult{err: executionContextError(err)}
			continue
		}
		ctx, cancel := context.WithTimeout(request.ctx, wallTimeout)
		response, err := w.exchange(ctx, protocolRequest{Version: protocolVersion, Type: requestRun, ID: fmt.Sprintf("%d", time.Now().UnixNano()), Script: request.input.Script, InputJSON: request.input.InputJSON})
		cancel()
		if err != nil {
			request.response <- runResult{err: err}
			return
		}
		if response.Code != "" {
			request.response <- runResult{err: protocolError(response)}
			return
		}
		request.response <- runResult{output: &RunOutput{ResultJSON: response.ResultJSON, Stdout: response.Stdout}}
		successes++
		if successes >= r.config.MaxSuccessfulRuns {
			return
		}
	}
}

func (r *Runner) replaceWorker() {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		r.mu.Lock()
		closed := r.closed
		r.mu.Unlock()
		if closed {
			return
		}
		if r.startWorker(context.Background()) == nil {
			return
		}
		select {
		case <-r.closedDone:
			return
		case <-ticker.C:
		}
	}
}

func (r *Runner) Run(ctx context.Context, input RunInput) (*RunOutput, error) {
	if len(strings.TrimSpace(input.Script)) == 0 {
		return nil, invalid("script is required")
	}
	if len(input.Script) > MaxSourceBytes {
		return nil, invalid("script exceeds the source limit")
	}
	if len(input.InputJSON) > MaxInputBytes {
		return nil, invalid("input exceeds the input limit")
	}
	inputJSON, err := validateRunInput(input.InputJSON)
	if err != nil {
		return nil, err
	}
	if err := ctx.Err(); err != nil {
		return nil, executionContextError(err)
	}
	request := &job{ctx: ctx, input: RunInput{Script: input.Script, InputJSON: inputJSON}, response: make(chan runResult, 1)}
	r.mu.Lock()
	if r.closed || r.healthy == 0 {
		r.mu.Unlock()
		return nil, &Error{Code: Unavailable, Msg: runtimeUnavailableMessage}
	}
	select {
	case r.jobs <- request:
		r.mu.Unlock()
	case <-ctx.Done():
		r.mu.Unlock()
		return nil, executionContextError(ctx.Err())
	default:
		r.mu.Unlock()
		return nil, &Error{Code: ResourceExhausted, Msg: "python queue is full"}
	}
	select {
	case result := <-request.response:
		return result.output, result.err
	case <-ctx.Done():
		return nil, executionContextError(ctx.Err())
	}
}

func (r *Runner) Close() { _ = r.CloseContext(context.Background()) }

// CloseContext stops admissions and lets queued and active requests finish
// until ctx expires. On expiry it kills workers and fails remaining queued work.
func (r *Runner) CloseContext(ctx context.Context) error {
	r.closeOnce.Do(func() {
		r.mu.Lock()
		r.closed = true
		close(r.jobs)
		r.mu.Unlock()
		go func() {
			r.workerWG.Wait()
			r.replaceWG.Wait()
			close(r.closedDone)
		}()
	})
	select {
	case <-r.closedDone:
		return nil
	case <-ctx.Done():
		r.mu.Lock()
		workers := make([]*childWorker, 0, len(r.workers))
		for w := range r.workers {
			workers = append(workers, w)
		}
		r.mu.Unlock()
		for _, w := range workers {
			w.stop()
		}
		for request := range r.jobs {
			request.response <- runResult{err: &Error{Code: Unavailable, Msg: runtimeUnavailableMessage}}
		}
		return ctx.Err()
	}
}
