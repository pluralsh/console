package python

import (
	"context"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/pool"
)

// Runner accepts Python executions and manages its worker processes.
type Runner interface {
	// Run validates and executes input, respecting ctx while queued and running.
	Run(context.Context, RunInput) (*RunOutput, error)
	// CloseContext stops admission and waits for workers until ctx expires.
	CloseContext(context.Context) error
}

// NewRunner starts a configured set of isolated Python workers.
func NewRunner(ctx context.Context, config RunnerConfig) (Runner, error) {
	config, err := resolveRunnerConfig(config)
	if err != nil {
		return nil, err
	}

	return pool.New(ctx, pool.Config{
		Workers:                        config.Workers,
		QueueSize:                      config.QueueSize,
		MaxSuccessfulRunsBeforeRecycle: config.MaxSuccessfulRunsBeforeRecycle,
		Process: pool.ProcessConfig{
			Executable:  config.WorkerProcess.Executable,
			Arguments:   config.WorkerProcess.Arguments,
			Environment: config.WorkerProcess.Environment,
		},
	})
}
