package sink

import (
	"context"
	"time"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	console "github.com/pluralsh/deployment-operator/pkg/client"
)

const (
	defaultBufferSizeLimit = 4096 // in kilobytes
	defaultThrottleTime    = 5 * time.Second
)

type ConsoleWriter struct {
	// buffer allows us to effectively store and flush the logs on demand
	// when specific conditions are met.
	buffer *helpers.Buffer

	// ctx is a standard context used by the internal watcher. When
	// context is canceled or done it will enforce graceful shutdown
	// and flush all logs remaining in the buffer before exiting.
	ctx context.Context

	// id is a stack run id that logs should be appended to.
	id string

	// client is a console client used to flush the logs.
	client console.Client

	// throttle controls how frequently logs will be flushed to its destination
	throttle time.Duration

	// bufferSizeLimit forces logs flush after limit has been reached.
	bufferSizeLimit int

	// ticker is a simple ticker used to coordinate logs flush on specific
	// time intervals as configured via throttle.
	ticker *time.Ticker

	// onFinish is a callback function called when internal watcher is stopped
	// and writer has finished all remaining work. It is used to coordinate
	// a graceful shutdown of the application and wait for all concurrent writers
	// to finish before exiting.
	onFinish func()

	// stopChan is used to signal that the writer should be stopped and all
	// remaining logs in the buffer should be flushed immediately.
	// Unlike stopChan it must be passed using WithStopChan option during
	// ConsoleWriter creation.
	stopChan chan struct{}

	// closeChan is used to signal that the io.Closer Close method was called
	// externally and the writer should be closed and all remaining logs in the
	// buffer should be flushed immediately. It is initialized internally and can
	// only be closed via io.Closer Close method.
	closeChan chan struct{}
}

type Option func(*ConsoleWriter)
