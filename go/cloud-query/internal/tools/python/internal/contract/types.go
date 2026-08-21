package contract

const (
	// MaxSourceBytes bounds Python source accepted for one execution.
	MaxSourceBytes = 64 << 10
	// MaxInputBytes bounds the JSON input accepted for one execution.
	MaxInputBytes = 1 << 20
	// MaxResultBytes bounds the JSON result returned for one execution.
	MaxResultBytes = 1 << 20
	// MaxStdoutBytes bounds stdout captured for one execution.
	MaxStdoutBytes = 64 << 10
	// MaxDetailBytes bounds private diagnostics retained or sent on the protocol.
	MaxDetailBytes = 64 << 10
	// MaxPublicMessageBytes bounds a sanitized error summary sent by a worker.
	MaxPublicMessageBytes = 4 << 10
)

// RunInput contains validated source and the JSON object supplied as input.
type RunInput struct {
	Script    string
	InputJSON string
}

// RunOutput contains the JSON object assigned to output and captured stdout.
type RunOutput struct {
	ResultJSON string
	Stdout     string
}

// Code identifies a stable class of execution failure.
type Code string

const (
	// InvalidArgument reports invalid source, input, or output values.
	InvalidArgument Code = "invalid_argument"
	// FailedPrecondition reports a Python execution failure after validation.
	FailedPrecondition Code = "failed_precondition"
	// Canceled reports cancellation by the caller.
	Canceled Code = "canceled"
	// DeadlineExceeded reports an execution deadline that elapsed.
	DeadlineExceeded Code = "deadline_exceeded"
	// ResourceExhausted reports a configured capacity or resource limit.
	ResourceExhausted Code = "resource_exhausted"
	// Unavailable reports that no runtime worker can accept the request.
	Unavailable Code = "unavailable"
	// Internal reports an unclassified runner or worker failure.
	Internal Code = "internal"
)
