package exec

import (
	"context"
	"io"
)

// StdioProcess is a running executable with bidirectional standard input and
// output. The process owner must drain Stdout and Stderr before calling Wait.
// Stop closes the input stream and terminates the process; it is safe to call
// more than once.
type StdioProcess struct {
	Stdin  io.WriteCloser
	Stdout io.ReadCloser
	Stderr io.ReadCloser

	wait  func() error
	kill  func() error
	close func() error
	stop  func() error
}

// StdioProcessHooks supplies lifecycle operations for a StdioProcess. It is
// useful for protocol adapters and deterministic tests that provide their own
// in-memory streams.
type StdioProcessHooks struct {
	Wait  func() error
	Kill  func() error
	Stop  func() error
	Close func() error
}

// NewStdioProcess wraps bidirectional streams and their lifecycle operations.
func NewStdioProcess(stdin io.WriteCloser, stdout, stderr io.ReadCloser, hooks StdioProcessHooks) *StdioProcess {
	return &StdioProcess{
		Stdin:  stdin,
		Stdout: stdout,
		Stderr: stderr,
		wait:   hooks.Wait,
		kill:   hooks.Kill,
		stop:   hooks.Stop,
		close:  hooks.Close,
	}
}

// Wait waits for the process and runs its post-start lifecycle hook. It also
// closes the process streams after the child exits.
func (p *StdioProcess) Wait() error {
	if p == nil || p.wait == nil {
		return nil
	}
	return p.wait()
}

// Kill terminates the child process without waiting for it.
func (p *StdioProcess) Kill() error {
	if p == nil || p.kill == nil {
		return nil
	}
	return p.kill()
}

// Stop closes stdin and terminates the child process.
func (p *StdioProcess) Stop() error {
	if p == nil || p.stop == nil {
		return nil
	}
	return p.stop()
}

// Close closes all process streams. It does not wait for the process.
func (p *StdioProcess) Close() error {
	if p == nil || p.close == nil {
		return nil
	}
	return p.close()
}

// StdioExecutable is implemented by executables that can be started with
// bidirectional standard streams. It is intentionally separate from
// Executable so existing callers and test doubles keep their contracts.
type StdioExecutable interface {
	Executable
	StartWithStdio(context.Context) (*StdioProcess, error)
}
