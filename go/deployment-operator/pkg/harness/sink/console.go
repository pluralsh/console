package sink

import (
	"context"
	"io"
	"time"

	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	console "github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

// Write implements io.Writer interface.
func (in *ConsoleWriter) Write(p []byte) (int, error) {
	return in.buffer.Write(p)
}

// Close implements io.Closer interface.
func (in *ConsoleWriter) Close() error {
	close(in.closeChan)
	return nil
}

// bufferedFlush sends logs to the console only when available
// logs size is greater or equal to bufferSizeLimit.
func (in *ConsoleWriter) bufferedFlush() {
	n := in.buffer.Len()
	if n < in.bufferSizeLimit {
		return
	}

	// flush logs
	klog.V(log.LogLevelTrace).InfoS("flushing buffered logs", "buffer_size", n, "limit", in.bufferSizeLimit, "step_id", in.id)
	read := n
	if read > in.bufferSizeLimit {
		read = in.bufferSizeLimit
	}

	if err := in.client.AddStackRunLogs(in.id, string(in.buffer.Next(read))); err != nil {
		klog.Error(err)
	}
}

// flush sends logs to the console.
// When ignoreLimit is true it sends all available logs to the console,
// otherwise it sends logs up to the bufferSizeLimit.
func (in *ConsoleWriter) flush(ignoreLimit bool) {
	n := in.buffer.Len()
	if n <= 0 {
		return
	}

	if ignoreLimit {
		// flush all logs
		klog.V(log.LogLevelTrace).InfoS("flushing all remaining logs", "buffer_size", n, "step_id", in.id)
		if err := in.client.AddStackRunLogs(in.id, in.buffer.String()); err != nil {
			klog.Error(err)
		}
		return
	}

	// flush logs up to the limit
	klog.V(log.LogLevelTrace).InfoS("flushing logs", "buffer_size", n, "limit", in.bufferSizeLimit, "step_id", in.id)
	read := n
	if read > in.bufferSizeLimit {
		read = in.bufferSizeLimit
	}

	if err := in.client.AddStackRunLogs(in.id, string(in.buffer.Next(read))); err != nil {
		klog.Error(err)
	}
}

func (in *ConsoleWriter) startWatcher() {
	go func() {
		defer in.stopWatcher()

	loop:
		for {
			select {
			case <-in.closeChan:
				break loop
			case <-in.stopChan:
				break loop
			case <-in.ctx.Done():
				break loop
			case <-in.buffer.Updated():
				in.bufferedFlush()
			case <-in.ticker.C:
				in.flush(false)
			}
		}
	}()
}

func (in *ConsoleWriter) stopWatcher() {
	in.ticker.Stop()
	if in.onFinish != nil {
		in.onFinish()
	}

	in.flush(true)
}

func (in *ConsoleWriter) init() io.WriteCloser {
	if in.throttle == 0 {
		klog.Warningf("throttle cannot be set to 0, defaulting to: %d", defaultThrottleTime)
		in.throttle = defaultThrottleTime
	}

	if in.bufferSizeLimit == 0 {
		klog.Warningf("bufferSizeLimit cannot be set to 0, defaulting to: %d", defaultBufferSizeLimit)
		in.bufferSizeLimit = defaultBufferSizeLimit
	}

	if in.stopChan == nil {
		in.stopChan = make(chan struct{})
	}

	in.ticker = time.NewTicker(in.throttle)
	in.startWatcher()
	return in
}

func NewConsoleWriter(ctx context.Context, client console.Client, options ...Option) io.WriteCloser {
	result := &ConsoleWriter{
		ctx:       ctx,
		buffer:    helpers.NewBuffer(),
		client:    client,
		closeChan: make(chan struct{}),
	}

	for _, option := range options {
		option(result)
	}

	return result.init()
}
