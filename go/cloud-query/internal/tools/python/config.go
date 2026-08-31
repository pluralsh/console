package python

import (
	"os"

	"github.com/samber/lo"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/contract"
)

const (
	defaultWorkers   = 4
	defaultQueueSize = 16
	defaultRecycle   = 10
)

var currentExecutable = os.Executable

// WorkerProcessConfig configures the command used for each isolated worker.
// Environment replaces the inherited environment instead of extending it.
type WorkerProcessConfig struct {
	Executable  string
	Arguments   []string
	Environment []string
}

// RunnerConfig configures worker capacity, queueing, recycling, and process
// startup. Zero-valued capacity settings use the package defaults.
type RunnerConfig struct {
	Workers                        int
	QueueSize                      int
	MaxSuccessfulRunsBeforeRecycle int
	WorkerProcess                  WorkerProcessConfig
}

func resolveRunnerConfig(overlay RunnerConfig) (RunnerConfig, error) {
	config := RunnerConfig{
		Workers:                        defaultWorkers,
		QueueSize:                      defaultQueueSize,
		MaxSuccessfulRunsBeforeRecycle: defaultRecycle,
		WorkerProcess: WorkerProcessConfig{
			Arguments:   []string{"python-worker"},
			Environment: []string{"TMPDIR=/tmp"},
		},
	}
	if overlay.Workers != 0 {
		config.Workers = overlay.Workers
	}

	if overlay.QueueSize != 0 {
		config.QueueSize = overlay.QueueSize
	}

	if overlay.MaxSuccessfulRunsBeforeRecycle != 0 {
		config.MaxSuccessfulRunsBeforeRecycle = overlay.MaxSuccessfulRunsBeforeRecycle
	}

	if overlay.WorkerProcess.Executable != "" {
		config.WorkerProcess.Executable = overlay.WorkerProcess.Executable
	} else {
		executable, err := currentExecutable()
		if err != nil {
			return RunnerConfig{}, contract.UnavailableError("locating the python worker executable", err)
		}

		config.WorkerProcess.Executable = executable
	}

	if overlay.WorkerProcess.Arguments != nil {
		config.WorkerProcess.Arguments = lo.Clone(overlay.WorkerProcess.Arguments)
	}

	if overlay.WorkerProcess.Environment != nil {
		config.WorkerProcess.Environment = lo.Clone(overlay.WorkerProcess.Environment)
	}

	return config, nil
}
