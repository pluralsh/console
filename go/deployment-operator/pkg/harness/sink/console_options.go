package sink

import (
	"time"
)

func WithThrottle(throttle time.Duration) Option {
	return func(writer *ConsoleWriter) {
		writer.throttle = throttle
	}
}

func WithBufferSizeLimit(limit int) Option {
	return func(writer *ConsoleWriter) {
		writer.bufferSizeLimit = limit
	}
}

func WithID(id string) Option {
	return func(writer *ConsoleWriter) {
		writer.id = id
	}
}

func WithOnFinish(onFinish func()) Option {
	return func(writer *ConsoleWriter) {
		writer.onFinish = onFinish
	}
}

func WithStopChan(stopChan chan struct{}) Option {
	return func(writer *ConsoleWriter) {
		writer.stopChan = stopChan
	}
}
