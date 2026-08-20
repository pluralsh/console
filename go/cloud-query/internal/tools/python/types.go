package python

import "github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/contract"

// RunInput contains the source and JSON object supplied to a Python execution.
type RunInput = contract.RunInput

// RunOutput contains the JSON object assigned to output and captured stdout.
type RunOutput = contract.RunOutput

// Code identifies a stable category of Python runner failure.
type Code = contract.Code

const (
	// InvalidArgument reports invalid source, input, or output values.
	InvalidArgument = contract.InvalidArgument
	// FailedPrecondition reports an execution failure after input validation.
	FailedPrecondition = contract.FailedPrecondition
	// Canceled reports cancellation by the caller.
	Canceled = contract.Canceled
	// DeadlineExceeded reports an execution deadline that elapsed.
	DeadlineExceeded = contract.DeadlineExceeded
	// ResourceExhausted reports a configured capacity or resource limit.
	ResourceExhausted = contract.ResourceExhausted
	// Unavailable reports that no Python runtime worker can accept the request.
	Unavailable = contract.Unavailable
	// Internal reports an unclassified runner or worker failure.
	Internal = contract.Internal
)
