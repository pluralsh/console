package pool

import (
	"strings"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/contract"
)

// ProcessConfig configures the command used for an isolated worker process.
// Environment replaces the parent process environment.
type ProcessConfig struct {
	Executable  string
	Arguments   []string
	Environment []string
}

// Config configures a Runner's worker capacity, queue, recycling, and process.
type Config struct {
	Workers                        int
	QueueSize                      int
	MaxSuccessfulRunsBeforeRecycle int
	Process                        ProcessConfig
}

func validate(config Config) error {
	if config.Workers <= 0 {
		return contract.Invalid("python runner workers must be greater than zero", nil)
	}
	if config.QueueSize < 0 {
		return contract.Invalid("python runner queue size must not be negative", nil)
	}
	if config.MaxSuccessfulRunsBeforeRecycle <= 0 {
		return contract.Invalid("python runner recycle limit must be greater than zero", nil)
	}
	if strings.TrimSpace(config.Process.Executable) == "" {
		return contract.Invalid("python worker executable is required", nil)
	}
	for _, entry := range config.Process.Environment {
		if !strings.Contains(entry, "=") {
			return contract.Invalid("python worker environment entries must use NAME=value", nil)
		}
	}
	return nil
}
