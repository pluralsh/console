package exec

import (
	"context"
	"io"
	"time"

	v1 "github.com/pluralsh/deployment-operator/pkg/harness/stackrun/v1"
)

type WaitFn func() error

type Executable interface {
	ID() string
	Run(ctx context.Context) error
	Start(ctx context.Context) (WaitFn, error)
	RunWithOutput(ctx context.Context) ([]byte, error)
	RunStream(ctx context.Context, cb func([]byte)) error
	Command() string
}

// executable wraps command calls to make it easier to run and process output.
type executable struct {
	// id uniquely identifies a command
	// it can be used to keep track of commands
	// called via the API.
	id string

	// workingDirectory specifies the working workingDirectory of the command.
	// If workingDirectory is empty then runs the command in the calling process's current workingDirectory.
	workingDirectory string

	// env specifies the environment of the process.
	// Each entry is of the form "key=value".
	env []string

	// command specifies root command that will be executed
	command string

	// args
	args []string

	// timeout
	timeout time.Duration

	// logSink is a custom writer that can be used to forward
	// executable output. It does not stop output from being forwarded
	// to the [os.Stdout].
	outputSinks []io.WriteCloser

	// outputAnalyzer
	outputAnalyzer OutputAnalyzer

	// hookFunctions ...
	hookFunctions map[v1.Lifecycle]v1.HookFunction
}

type Option func(*executable)
