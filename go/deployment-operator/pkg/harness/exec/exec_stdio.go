package exec

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"k8s.io/klog/v2"

	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/stackrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const stderrTailLimit = 8 * 1024

// StartWithStdio starts an executable without taking ownership of its standard
// output stream. It retains a bounded standard-error tail for protocol failure
// diagnostics. Callers must drain Stdout before calling Wait.
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
	runtime := &stdioRuntime{
		cmd:        cmd,
		runCtx:     runCtx,
		cancelRun:  cancelRun,
		executable: in,
		stdin:      stdin,
		stdout:     stdout,
	}
	cmd.Stderr = runtime
	cmd.WaitDelay = time.Second

	klog.V(log.LogLevelExtended).InfoS("executing", "command", in.Command())
	if err := cmd.Start(); err != nil {
		cancelRun()
		_ = stdin.Close()
		_ = stdout.Close()
		return nil, err
	}

	return NewStdioProcess(stdin, stdout, io.NopCloser(strings.NewReader("")), StdioProcessHooks{
		Wait:       runtime.wait,
		Kill:       runtime.kill,
		Stop:       runtime.stop,
		Close:      runtime.closeStreams,
		StderrTail: runtime.stderrTail,
	}), nil
}

type stdioRuntime struct {
	cmd        *exec.Cmd
	runCtx     context.Context
	cancelRun  context.CancelFunc
	executable *executable
	stdin      io.WriteCloser
	stdout     io.ReadCloser

	waitOnce  sync.Once
	waitErr   error
	closeOnce sync.Once
	closeErr  error
	stopOnce  sync.Once
	stopErr   error
	stopped   bool
	stderr    []byte
	mu        sync.Mutex
}

func (runtime *stdioRuntime) Write(input []byte) (int, error) {
	runtime.mu.Lock()
	defer runtime.mu.Unlock()
	runtime.stderr = append(runtime.stderr, input...)
	if overflow := len(runtime.stderr) - stderrTailLimit; overflow > 0 {
		runtime.stderr = append([]byte(nil), runtime.stderr[overflow:]...)
	}
	return len(input), nil
}

func (runtime *stdioRuntime) stderrTail() string {
	runtime.mu.Lock()
	defer runtime.mu.Unlock()
	return string(runtime.stderr)
}

func (runtime *stdioRuntime) closeStreams() error {
	runtime.closeOnce.Do(func() {
		for _, stream := range []io.Closer{runtime.stdin, runtime.stdout} {
			if err := stream.Close(); err != nil && !errors.Is(err, os.ErrClosed) {
				runtime.closeErr = errors.Join(runtime.closeErr, err)
			}
		}
	})
	return runtime.closeErr
}

func (runtime *stdioRuntime) wait() error {
	runtime.waitOnce.Do(func() {
		runtime.waitErr = runtime.cmd.Wait()
		cause := context.Cause(runtime.runCtx)
		runtime.cancelRun()
		_ = runtime.closeStreams()
		if runtime.wasStopped() {
			runtime.waitErr = nil
		} else if cause != nil {
			runtime.waitErr = errors.Join(runtime.waitErr, cause)
		}
		if err := runtime.executable.runLifecycleFunction(v1.LifecyclePostStart); err != nil {
			runtime.waitErr = errors.Join(runtime.waitErr, err)
		}
	})
	return runtime.waitErr
}

func (runtime *stdioRuntime) kill() error {
	if runtime.cmd.Process == nil {
		return nil
	}
	err := runtime.cmd.Process.Kill()
	if errors.Is(err, os.ErrProcessDone) {
		return nil
	}
	return err
}

func (runtime *stdioRuntime) stop() error {
	runtime.stopOnce.Do(func() {
		runtime.mu.Lock()
		runtime.stopped = true
		runtime.mu.Unlock()
		_ = runtime.stdin.Close()
		runtime.stopErr = runtime.kill()
	})
	return runtime.stopErr
}

func (runtime *stdioRuntime) wasStopped() bool {
	runtime.mu.Lock()
	defer runtime.mu.Unlock()
	return runtime.stopped
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
