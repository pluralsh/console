package python

import (
	"io"

	internalworker "github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/worker"
)

// Worker serves the private parent-to-worker protocol on a pair of streams.
type Worker interface {
	// Run processes requests until the input reaches EOF or an I/O error occurs.
	Run(io.Reader, io.Writer) error
}

// NewWorker constructs the worker implementation used by the python-worker command.
func NewWorker() Worker { return internalworker.NewServer() }
