package exec

import (
	"context"
	"fmt"
	"sync"

	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/log"
)

func (in *executor) Start(ctx context.Context) error {
	in.start.Lock()
	in.started = true
	in.start.Unlock()

	switch in.strategy {
	case ExecutionStrategyOrdered:
		in.ordered(ctx)
		return nil
	case ExecutionStrategyParallel:
		in.parallel(ctx)
		return nil
	}

	return fmt.Errorf("unknown execution strategy %v", in.strategy)
}

func (in *executor) Add(executable Executable) error {
	if in.started {
		return fmt.Errorf("executor has already started")
	}

	klog.V(log.LogLevelDebug).InfoS("enqueueing", "command", executable.Command())

	in.start.Lock()
	defer in.start.Unlock()
	in.startQueue = append(in.startQueue, executable)

	return nil
}

func (in *executor) ordered(ctx context.Context) {
	if len(in.startQueue) == 0 {
		klog.V(log.LogLevelDebug).InfoS("executables queue is empty", "queue", len(in.startQueue))
		return
	}

	klog.V(log.LogLevelDebug).InfoS("starting executables in order", "queue", len(in.startQueue))

	// Read executables and run them in order
	go func() {
		for _, executable := range in.startQueue {
			if err := in.run(ctx, executable); err != nil {
				in.errChan <- err
				return
			}
		}
		close(in.finishedChan)
	}()
}

func (in *executor) parallel(ctx context.Context) {
	if len(in.startQueue) == 0 {
		klog.V(log.LogLevelDebug).InfoS("executables queue is empty", "queue", len(in.startQueue))
		return
	}

	klog.V(log.LogLevelDebug).InfoS("starting executables in parallel", "queue", len(in.startQueue))

	wg := &sync.WaitGroup{}

	// Run all executables at once
	for i := range in.startQueue {
		wg.Add(1)
		executable := in.startQueue[i]
		go func() {
			if err := in.run(ctx, executable); err != nil {
				in.errChan <- err
			}
			wg.Done()
		}()
	}

	go func() {
		// We are finished when all executables complete.
		wg.Wait()
		close(in.finishedChan)
	}()
}

func (in *executor) run(ctx context.Context, executable Executable) (retErr error) {
	if in.preRunFunc != nil {
		in.preRunFunc(executable.ID())
	}

	if err := executable.Run(ctx); err != nil {
		retErr = fmt.Errorf("command execution failed: %s: err: %w", executable.Command(), err)
	}

	if in.postRunFunc != nil {
		in.postRunFunc(executable.ID(), retErr)
	}

	return retErr
}

func NewExecutor(errChan chan error, finishedChan chan struct{}, options ...ExecutorOption) Executor {
	result := &executor{
		errChan:      errChan,
		finishedChan: finishedChan,
		strategy:     ExecutionStrategyOrdered,
	}

	for _, option := range options {
		option(result)
	}

	return result
}
