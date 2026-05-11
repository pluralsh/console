package exec

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/pluralsh/console/go/polly/algorithms"
	"k8s.io/apimachinery/pkg/util/uuid"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/harness/signals"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/stackrun/v1"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

func (in *executable) Run(ctx context.Context) error {
	cmd, err := in.prepare(ctx, false)
	if err != nil {
		return err
	}
	defer in.close(in.outputSinks)

	klog.V(log.LogLevelExtended).InfoS("executing", "command", in.Command())
	if err = cmd.Run(); err != nil {
		if err := context.Cause(ctx); err != nil {
			return err
		}
		return err
	}

	if err = in.analyze(); err != nil {
		return err
	}

	return in.runLifecycleFunction(v1.LifecyclePostStart)
}

func (in *executable) Start(ctx context.Context) (WaitFn, error) {
	cmd, err := in.prepare(ctx, false)
	if err != nil {
		return nil, err
	}

	klog.V(log.LogLevelExtended).InfoS("executing", "command", in.Command())
	if err = cmd.Start(); err != nil {
		return nil, err
	}

	waiter := func() error {
		defer in.close(in.outputSinks)
		return cmd.Wait()
	}

	return waiter, in.runLifecycleFunction(v1.LifecyclePostStart)
}

func (in *executable) RunWithOutput(ctx context.Context) ([]byte, error) {
	cmd := exec.CommandContext(ctx, in.command, in.args...)

	// Configure environment of the executable.
	// Root process environment is used as a base and passed in env vars
	// are added on top of that. In case of duplicate keys, custom env
	// vars passed to the executable will override root process env vars.
	cmd.Env = append(os.Environ(), in.env...)

	if len(in.workingDirectory) > 0 {
		cmd.Dir = in.workingDirectory
	}

	klog.V(log.LogLevelExtended).InfoS("executing", "command", in.Command())
	return cmd.CombinedOutput()
}

func (in *executable) Command() string {
	return fmt.Sprintf("%s %s", in.command, strings.Join(in.args, " "))
}

func (in *executable) ID() string {
	if len(in.id) == 0 {
		in.id = string(uuid.NewUUID())
	}

	return in.id
}

func (in *executable) prepare(ctx context.Context, streaming bool) (*exec.Cmd, error) {
	if err := in.runLifecycleFunction(v1.LifecyclePreStart); err != nil {
		return nil, err
	}

	ctx = signals.NewCancelableContext(ctx, signals.NewTimeoutSignal(in.timeout))
	cmd := exec.CommandContext(ctx, in.command, in.args...)
	if !streaming {
		w := in.writer()
		// Configure additional writers so that we can simultaneously write output
		// to multiple destinations
		// Note: We need to use the same writer for stdout and stderr to guarantee
		// 		 thread-safe writing, otherwise output from stdout and stderr could be
		//		 written concurrently and get reordered.
		cmd.Stdout = w
		cmd.Stderr = w

		if in.outputAnalyzer != nil {
			cmd.Stderr = io.MultiWriter(w, in.outputAnalyzer.Stderr())
		}
	}

	// Configure environment of the executable.
	// Root process environment is used as a base and passed in env vars
	// are added on top of that. In case of duplicate keys, custom env
	// vars passed to the executable will override root process env vars.
	cmd.Env = append(os.Environ(), in.env...)

	if len(in.workingDirectory) > 0 {
		cmd.Dir = in.workingDirectory
	}

	return cmd, nil
}

func (in *executable) writer() io.Writer {
	writers := []io.Writer{os.Stdout}

	if len(in.outputSinks) > 0 {
		writers = append(writers, algorithms.Map(
			in.outputSinks,
			func(writer io.WriteCloser) io.Writer {
				return writer
			})...,
		)
	}

	if in.outputAnalyzer != nil {
		writers = append(writers, in.outputAnalyzer.Stdout())
	}

	return io.MultiWriter(writers...)
}

func (in *executable) close(writers []io.WriteCloser) {
	if len(writers) == 0 {
		return
	}

	for _, w := range writers {
		if err := w.Close(); err != nil {
			klog.ErrorS(err, "failed to close writer")
		}
	}
}

func (in *executable) runLifecycleFunction(lifecycle v1.Lifecycle) error {
	if fn, exists := in.hookFunctions[lifecycle]; exists {
		return fn()
	}

	return nil
}

func (in *executable) analyze() error {
	if in.outputAnalyzer == nil {
		return nil
	}

	if err := in.outputAnalyzer.Detect(); len(err) > 0 {
		return errors.Join(err...)
	}

	return nil
}

func NewExecutable(command string, options ...Option) Executable {
	result := &executable{
		command:       command,
		args:          make([]string, 0),
		env:           make([]string, 0),
		hookFunctions: make(map[v1.Lifecycle]v1.HookFunction),
		timeout:       60 * time.Minute,
	}

	for _, o := range options {
		o(result)
	}

	return result
}

func (in *executable) RunStream(ctx context.Context, cb func([]byte)) error {
	// Call prepare() to get properly configured cmd
	cmd, err := in.prepare(ctx, true)
	if err != nil {
		return err
	}

	// Pipes for streaming
	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	klog.V(log.LogLevelExtended).InfoS("executing", "command", in.Command())

	if err := cmd.Start(); err != nil {
		return err
	}

	var wg sync.WaitGroup
	wg.Add(2)

	// Shared writer to mimic non-streaming output behavior (writes to os.Stdout + sinks + analyzer stdout)
	outWriter := in.writer()

	// Protect writing to outWriter in case some underlying WriteClosers are not concurrent-safe.
	var writeMu sync.Mutex

	// Collect scanner errors
	var scErrMu sync.Mutex
	var scannerErrs []error

	// Callback worker to prevent callback backpressure from stalling stream readers.
	var cbCh chan []byte
	if cb != nil {
		const callbackBufferSize = 256
		cbCh = make(chan []byte, callbackBufferSize)
		go func() {
			for line := range cbCh {
				// Protect callback with recover to avoid goroutine crash leaking.
				func() {
					defer func() {
						if r := recover(); r != nil {
							klog.ErrorS(fmt.Errorf("panic in callback: %v", r), "panic in RunStream callback")
						}
					}()
					cb(line)
				}()
			}
		}()
	}

	// helper to record scanner errors
	recordScannerErr := func(e error) {
		if e == nil {
			return
		}
		if errors.Is(e, io.ErrClosedPipe) || strings.Contains(e.Error(), "file already closed") {
			return
		}
		scErrMu.Lock()
		scannerErrs = append(scannerErrs, e)
		scErrMu.Unlock()
	}

	// Stream lines from a reader, call callback, and write to sinks
	streamReader := func(r io.Reader, name string) {
		defer func() {
			klog.V(log.LogLevelDebug).InfoS("stream reader finished", "reader", name)
			wg.Done()
		}()

		scanner := bufio.NewScanner(r)

		// Increase the buffer to handle longer lines safely (adjust max if you expect huge single-line JSON).
		const maxTokenSize = 1 * 1024 * 1024 // 1MB
		scanner.Buffer(make([]byte, 64*1024), maxTokenSize)

		for scanner.Scan() {
			line := append([]byte(nil), scanner.Bytes()...)

			// Queue callback (non-blocking best-effort).
			if cbCh != nil {
				select {
				case cbCh <- line:
				default:
					klog.V(log.LogLevelDebug).InfoS("dropping stream line because callback backlog", "reader", name)
				}
			}

			// Write to sinks (append newline because Scanner strips it)
			if outWriter != nil {
				writeMu.Lock()
				_, wErr := outWriter.Write(append(line, '\n'))
				writeMu.Unlock()
				if wErr != nil {
					// log and continue
					klog.ErrorS(wErr, "failed to write stream line to sinks")
				}
			}
		}

		if err := scanner.Err(); err != nil {
			recordScannerErr(err)
			// Log a friendly message (don't spam for benign closed-pipe)
			if !errors.Is(err, io.ErrClosedPipe) && !strings.Contains(err.Error(), "file already closed") {
				klog.ErrorS(err, "scanner error in RunStream")
			}
		}
	}

	go streamReader(stdoutPipe, "stdout")
	go streamReader(stderrPipe, "stderr")

	// Wait for readers to finish draining the pipes BEFORE calling cmd.Wait()
	wg.Wait()
	if cbCh != nil {
		close(cbCh)
	}

	// Close sinks now that readers finished writing to them
	in.close(in.outputSinks)

	// Now wait for the process to exit and capture its error (if any)
	waitErr := cmd.Wait()

	// Combine scanner errors into waitErr if any
	scErrMu.Lock()
	if len(scannerErrs) > 0 {
		for _, e := range scannerErrs {
			waitErr = errors.Join(waitErr, e)
		}
	}
	scErrMu.Unlock()

	// run analyzer & lifecycle hooks & context check
	if aErr := in.analyze(); aErr != nil {
		waitErr = errors.Join(waitErr, aErr)
	}
	if ctxErr := context.Cause(ctx); ctxErr != nil {
		waitErr = errors.Join(waitErr, ctxErr)
	}
	if hookErr := in.runLifecycleFunction(v1.LifecyclePostStart); hookErr != nil {
		waitErr = errors.Join(waitErr, hookErr)
	}

	return waitErr
}
