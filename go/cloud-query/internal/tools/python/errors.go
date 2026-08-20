package python

import (
	"context"
	"errors"
	"strings"
)

const (
	maxExceptionSummaryRunes  = 512
	runtimeUnavailableMessage = "python runtime is unavailable"
)

// Code is a safe, stable error category suitable for mapping to an RPC status.
type Code string

const (
	// InvalidArgument indicates invalid source, input, or output data.
	InvalidArgument Code = "invalid_argument"
	// FailedPrecondition indicates Python could not complete the requested operation.
	FailedPrecondition Code = "failed_precondition"
	// Canceled indicates the caller canceled execution.
	Canceled Code = "canceled"
	// DeadlineExceeded indicates execution exceeded its allotted time.
	DeadlineExceeded Code = "deadline_exceeded"
	// ResourceExhausted indicates a configured size, memory, or concurrency limit was exceeded.
	ResourceExhausted Code = "resource_exhausted"
	// Unavailable indicates no healthy Python worker is available.
	Unavailable Code = "unavailable"
	// Internal indicates an unexpected runner or worker failure.
	Internal Code = "internal"
)

// Error contains only a stable category and a safe summary. Protocol frames,
// child stderr, and host paths are intentionally never retained.
type Error struct {
	Code Code
	Msg  string
}

// Error returns the safe error summary.
func (e *Error) Error() string { return e.Msg }

// ErrorCode returns a safe classification for err. Errors outside this package
// are intentionally treated as Internal so callers never infer host details.
func ErrorCode(err error) Code {
	var runErr *Error
	if errors.As(err, &runErr) {
		return runErr.Code
	}
	return Internal
}

func invalid(msg string) error { return &Error{Code: InvalidArgument, Msg: msg} }

func runtimeError(kind, message string) error {
	switch kind {
	case "SyntaxError", "TypeError":
		return invalid(pythonExceptionSummary(kind, message))
	case "MemoryError", "RecursionError":
		return &Error{Code: ResourceExhausted, Msg: "python resource limit exceeded"}
	case "TimeoutError":
		return executionTimeoutError()
	default:
		return &Error{Code: FailedPrecondition, Msg: pythonExceptionSummary(kind, message)}
	}
}

// pythonExceptionSummary exposes the useful exception type and message while
// excluding tracebacks, worker diagnostics, protocol data, and unbounded text.
func pythonExceptionSummary(kind, message string) string {
	kind = strings.TrimSpace(strings.ToValidUTF8(kind, ""))
	message = strings.Join(strings.Fields(strings.ToValidUTF8(message, "")), " ")
	if kind == "" {
		kind = "Exception"
	}
	summary := "python " + kind
	if message != "" {
		summary += ": " + message
	}
	runes := []rune(summary)
	if len(runes) > maxExceptionSummaryRunes {
		summary = string(runes[:maxExceptionSummaryRunes-1]) + "…"
	}
	return summary
}

func runtimeFailure() error { return &Error{Code: Internal, Msg: "python runtime failed"} }

func executionTimeoutError() error {
	return &Error{Code: DeadlineExceeded, Msg: "python execution timed out"}
}

func executionContextError(err error) error {
	if errors.Is(err, context.Canceled) {
		return &Error{Code: Canceled, Msg: "python execution was canceled"}
	}

	return executionTimeoutError()
}
