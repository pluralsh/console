package pool

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/log"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/contract"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/protocol"
)

const wallTimeout = 65 * time.Second

// Runner owns a bounded set of isolated worker processes. It replaces workers
// after failures and recycles them after the configured number of successes.
type Runner struct {
	config     Config
	factory    processFactory
	jobs       chan job
	mu         sync.Mutex
	closed     bool
	processes  map[process]struct{}
	wg         sync.WaitGroup
	closeOnce  sync.Once
	done       chan struct{}
	requestIDs atomic.Uint64
	workerIDs  atomic.Uint64
	retry      func() <-chan time.Time
}

type job struct {
	requestID string
	queuedAt  time.Time
	ctx       context.Context
	input     contract.RunInput
	response  chan result
}

type result struct {
	output *contract.RunOutput
	err    error
}

// New starts config.Workers health-checked worker processes. If startup fails,
// it shuts down workers already started before returning the error.
func New(ctx context.Context, config Config) (*Runner, error) {
	return newRunner(ctx, config, newExecProcess)
}

func newRunner(ctx context.Context, config Config, factory processFactory) (*Runner, error) {
	if err := validate(config); err != nil {
		return nil, err
	}

	klog.V(log.LogLevelInfo).InfoS(
		"initializing python worker pool",
		"workers", config.Workers,
		"queue_size", config.QueueSize,
		"recycle_limit", config.MaxSuccessfulRunsBeforeRecycle,
	)

	runner := &Runner{
		config:    config,
		factory:   factory,
		jobs:      make(chan job, config.QueueSize),
		processes: map[process]struct{}{},
		done:      make(chan struct{}),
		retry: func() <-chan time.Time {
			return time.After(time.Second)
		},
	}

	for range config.Workers {
		if err := runner.start(ctx); err != nil {
			_ = runner.CloseContext(context.Background())
			return nil, contract.UnavailableError("python runtime is unavailable", err)
		}
	}

	klog.V(log.LogLevelInfo).InfoS("python worker pool is ready", "workers", config.Workers)

	return runner, nil
}

func (r *Runner) start(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, wallTimeout)
	defer cancel()

	// Worker IDs identify parent-side process lifecycles without exposing command details.
	workerID := r.workerIDs.Add(1)
	klog.V(log.LogLevelVerbose).InfoS("spawning python worker", "worker_id", workerID)
	process, err := r.factory(r.config.Process)
	if err != nil {
		logWorkerFailure("failed to start python worker process", workerID, err)
		return err
	}
	klog.V(log.LogLevelVerbose).InfoS("python worker process started", "worker_id", workerID)

	request := protocol.Request{
		Version: protocol.Version,
		Kind:    protocol.Health,
		ID:      fmt.Sprintf("%d", r.requestIDs.Add(1)),
	}

	response, err := process.exchange(ctx, request)
	if err != nil || response.Error != nil {
		process.stop()
		if err != nil {
			logWorkerFailure("python worker health check failed", workerID, err)
			return err
		}
		err = protocol.Error(response)
		logWorkerFailure("python worker health check failed", workerID, err)
		return err
	}
	klog.V(log.LogLevelVerbose).InfoS("python worker health check passed", "worker_id", workerID)

	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		process.stop()
		return contract.UnavailableError("python runtime is unavailable", nil)
	}

	r.processes[process] = struct{}{}
	r.wg.Add(1)
	r.mu.Unlock()

	go r.serve(process, workerID)
	return nil
}

// Run validates and enqueues input, then waits for its worker response or ctx.
// It rejects new work after shutdown begins or when the queue is full.
func (r *Runner) Run(ctx context.Context, input contract.RunInput) (*contract.RunOutput, error) {
	input, err := contract.ValidateRun(input)
	if err != nil {
		return nil, err
	}

	if err := ctx.Err(); err != nil {
		return nil, contract.ContextError(err)
	}

	job := job{
		requestID: fmt.Sprintf("%d", r.requestIDs.Add(1)),
		queuedAt:  time.Now(),
		ctx:       ctx,
		input:     input,
		response:  make(chan result, 1),
	}

	r.mu.Lock()
	if r.closed || len(r.processes) == 0 {
		r.mu.Unlock()
		return nil, contract.UnavailableError("python runtime is unavailable", nil)
	}

	select {
	case r.jobs <- job:
		klog.V(log.LogLevelExtended).InfoS(
			"python request queued",
			"request_id", job.requestID,
			"queued_jobs", len(r.jobs),
			"queue_capacity", cap(r.jobs),
		)
		r.mu.Unlock()
	case <-ctx.Done():
		r.mu.Unlock()
		return nil, contract.ContextError(ctx.Err())
	default:
		r.mu.Unlock()
		return nil, contract.Exhausted("python queue is full", nil)
	}

	select {
	case answer := <-job.response:
		return answer.output, answer.err
	case <-ctx.Done():
		return nil, contract.ContextError(ctx.Err())
	}
}

func (r *Runner) serve(process process, workerID uint64) {
	retirement := "shutdown"
	var retirementErr error
	defer func() {
		process.stop()

		r.mu.Lock()
		delete(r.processes, process)
		closed := r.closed
		r.mu.Unlock()

		if closed {
			retirement = "shutdown"
		}

		fields := []any{"worker_id", workerID, "reason", retirement}
		if retirementErr != nil {
			fields = append(fields,
				"error_code", contract.CodeOf(retirementErr),
				"error", contract.PublicMessage(retirementErr),
			)
		}

		klog.V(log.LogLevelExtended).InfoS("retiring python worker", fields...)
		if !closed {
			r.replace()
		}

		r.wg.Done()
	}()

	successes := 0
	for job := range r.jobs {
		klog.V(log.LogLevelExtended).InfoS(
			"python request taken from queue",
			"request_id", job.requestID,
			"worker_id", workerID,
			"queued_for", time.Since(job.queuedAt),
			"queued_jobs", len(r.jobs),
		)

		if err := job.ctx.Err(); err != nil {
			klog.V(log.LogLevelExtended).InfoS(
				"python request canceled before execution",
				"request_id", job.requestID,
				"worker_id", workerID,
				"error_code", contract.CodeOf(contract.ContextError(err)),
			)
			job.response <- result{err: contract.ContextError(err)}
			continue
		}

		ctx, cancel := context.WithTimeout(job.ctx, wallTimeout)
		request := protocol.Request{
			Version:   protocol.Version,
			Kind:      protocol.Run,
			ID:        job.requestID,
			Script:    job.input.Script,
			InputJSON: job.input.InputJSON,
		}

		startedAt := time.Now()
		klog.V(log.LogLevelExtended).InfoS(
			"python request execution started",
			"request_id", job.requestID,
			"worker_id", workerID,
		)

		response, err := process.exchange(ctx, request)
		cancel()
		if err != nil {
			logExecutionFinished(job.requestID, workerID, startedAt, err)
			job.response <- result{err: err}
			retirement = retirementReason(err)
			retirementErr = err
			return
		}
		if response.Error != nil {
			err := protocol.Error(response)
			logExecutionFinished(job.requestID, workerID, startedAt, err)
			job.response <- result{err: err}
			retirement = "remote_python_error"
			retirementErr = err
			return
		}

		logExecutionFinished(job.requestID, workerID, startedAt, nil)
		job.response <- result{output: &contract.RunOutput{
			ResultJSON: response.ResultJSON,
			Stdout:     response.Stdout,
		}}

		successes++
		if successes >= r.config.MaxSuccessfulRunsBeforeRecycle {
			retirement = "successful_recycle_limit"
			return
		}
	}
}

func logExecutionFinished(requestID string, workerID uint64, startedAt time.Time, err error) {
	status := "success"
	if err != nil {
		status = "error"
	}

	fields := []any{
		"request_id", requestID,
		"worker_id", workerID,
		"duration", time.Since(startedAt),
		"status", status,
	}
	if err != nil {
		fields = append(fields, "error_code", contract.CodeOf(err))
	}

	klog.V(log.LogLevelExtended).InfoS("python request execution finished", fields...)
}

func (r *Runner) replace() {
	for {
		r.mu.Lock()
		closed := r.closed
		r.mu.Unlock()

		if closed {
			return
		}
		klog.V(log.LogLevelExtended).InfoS("attempting python worker replacement")
		if err := r.start(context.Background()); err == nil {
			klog.V(log.LogLevelExtended).InfoS("python worker replacement succeeded")
			return
		}

		select {
		case <-r.done:
			return
		case <-r.retry():
		}
	}
}

// CloseContext stops admitting jobs, waits for worker shutdown, and kills
// remaining processes if ctx expires. It is safe to call more than once.
func (r *Runner) CloseContext(ctx context.Context) error {
	r.closeOnce.Do(func() {
		r.mu.Lock()
		r.closed = true
		processCount := len(r.processes)
		queuedJobs := len(r.jobs)
		close(r.jobs)
		r.mu.Unlock()
		klog.V(log.LogLevelInfo).InfoS(
			"starting python worker pool shutdown",
			"processes", processCount,
			"queued_jobs", queuedJobs,
		)
		go func() {
			r.wg.Wait()
			klog.V(log.LogLevelInfo).InfoS("python worker pool shutdown completed")
			close(r.done)
		}()
	})

	select {
	case <-r.done:
		return nil
	case <-ctx.Done():
		r.mu.Lock()
		processes := make([]process, 0, len(r.processes))
		for process := range r.processes {
			processes = append(processes, process)
		}
		r.mu.Unlock()

		for _, process := range processes {
			process.stop()
		}

		drainedJobs := 0
		for draining := true; draining; {
			select {
			case job, ok := <-r.jobs:
				if !ok {
					draining = false
					continue
				}
				job.response <- result{err: contract.UnavailableError("python runtime is unavailable", nil)}
				drainedJobs++
			default:
				draining = false
			}
		}
		klog.ErrorS(
			nil,
			"python worker pool shutdown deadline exceeded; forcing teardown",
			"processes", len(processes),
			"queued_jobs", drainedJobs,
		)
		return ctx.Err()
	}
}

func retirementReason(err error) string {
	if contract.CodeOf(err) == contract.Canceled {
		return "cancellation"
	}
	return "execution_or_transport_failure"
}

func logWorkerFailure(message string, workerID uint64, err error) {
	fields := []any{
		"error_code", contract.CodeOf(err),
		"error", contract.PublicMessage(err),
	}
	if workerID != 0 {
		fields = append([]any{"worker_id", workerID}, fields...)
	}
	klog.ErrorS(nil, message, fields...)
}
