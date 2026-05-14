package signals

import (
	"context"
)

type ExitCode uint8

func (e ExitCode) Int() int {
	return int(e)
}

const (
	// ExitCodeCancel - process stopped/killed via an external signal
	ExitCodeCancel ExitCode = 64
	// ExitCodeTimeout - process was running for too long and timed out
	ExitCodeTimeout ExitCode = 65
	// ExitCodeTerminated - shutdown was initiated either via SIGINT or SIGTERM
	ExitCodeTerminated ExitCode = 66
	// ExitCodeOther - other error
	ExitCodeOther ExitCode = 255
)

type Signal interface {
	Listen(cancelFunc context.CancelCauseFunc)
}
