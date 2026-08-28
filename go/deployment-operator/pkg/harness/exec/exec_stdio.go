package exec

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"

	"k8s.io/klog/v2"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/stackrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

// StartWithStdio starts an executable without taking ownership of its output
// streams. This is used by protocols that carry their own framed messages over
// stdin/stdout. Callers must drain Stdout and Stderr, then call Wait.
func (in *executable) StartWithStdio(ctx context.Context) (*StdioProcess, error) {
	if err := in.runLifecycleFunction(v1.LifecyclePreStart); err != nil {
		return nil, err
	}

	if ctx == nil {
		ctx = context.Background()
	}
	var runCtx context.Context
	var cancelRun context.CancelFunc
	if in.timeout > 0 {
		runCtx, cancelRun = context.WithTimeout(ctx, in.timeout)
	} else {
		runCtx, cancelRun = context.WithCancel(ctx)
	}
	cmd := exec.CommandContext(runCtx, in.command, in.args...)
	cmd.Env = append(os.Environ(), in.env...)
	if len(in.workingDirectory) > 0 {
		cmd.Dir = in.workingDirectory
	}

	stdin, err := cmd.StdinPipe()
	if err != nil {
		cancelRun()
		return nil, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		cancelRun()
		_ = stdin.Close()
		return nil, err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		cancelRun()
		_ = stdin.Close()
		_ = stdout.Close()
		return nil, err
	}

	klog.V(log.LogLevelExtended).InfoS("executing", "command", in.Command())
	if err := cmd.Start(); err != nil {
		cancelRun()
		_ = stdin.Close()
		_ = stdout.Close()
		_ = stderr.Close()
		return nil, err
	}

	var waitOnce sync.Once
	var waitErr error
	var closeOnce sync.Once
	var closeErr error
	var stopOnce sync.Once
	var stopErr error
	intentionalStop := false
	var stateMu sync.Mutex

	closeStreams := func() error {
		closeOnce.Do(func() {
			for _, stream := range []io.Closer{stdin, stdout, stderr} {
				if err := stream.Close(); err != nil && !errors.Is(err, os.ErrClosed) {
					closeErr = errors.Join(closeErr, err)
				}
			}
		})
		return closeErr
	}

	wait := func() error {
		waitOnce.Do(func() {
			waitErr = cmd.Wait()
			cause := context.Cause(runCtx)
			cancelRun()
			_ = closeStreams()

			stateMu.Lock()
			wasStopped := intentionalStop
			stateMu.Unlock()
			if cause != nil && !wasStopped {
				waitErr = errors.Join(waitErr, cause)
			}
			if wasStopped {
				// Stop is an intentional lifecycle operation. The process is
				// expected to report a signal-related exit in this case.
				waitErr = nil
			}
			if err := in.runLifecycleFunction(v1.LifecyclePostStart); err != nil {
				waitErr = errors.Join(waitErr, err)
			}
		})
		return waitErr
	}

	kill := func() error {
		if cmd.Process == nil {
			return nil
		}
		err := cmd.Process.Kill()
		if errors.Is(err, os.ErrProcessDone) {
			return nil
		}
		return err
	}

	stop := func() error {
		stopOnce.Do(func() {
			stateMu.Lock()
			intentionalStop = true
			stateMu.Unlock()
			_ = stdin.Close()
			stopErr = kill()
		})
		return stopErr
	}

	return NewStdioProcess(stdin, stdout, stderr, StdioProcessHooks{
		Wait:  wait,
		Kill:  kill,
		Stop:  stop,
		Close: closeStreams,
	}), nil
}

// StartWithStdio creates and starts a command with bidirectional standard
// streams. It is additive to NewExecutable and leaves existing execution
// behavior unchanged.
func StartWithStdio(ctx context.Context, command string, options ...Option) (*StdioProcess, error) {
	executable := NewExecutable(command, options...)
	stdio, ok := executable.(StdioExecutable)
	if !ok {
		return nil, fmt.Errorf("executable %q does not support bidirectional stdio", command)
	}
	return stdio.StartWithStdio(ctx)
}
