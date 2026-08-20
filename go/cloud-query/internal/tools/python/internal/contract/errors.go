package contract

import (
	"context"
	"errors"
	"strings"
)

const maxPublicRunes = 512
const detailTruncationMarker = "\n[python diagnostic truncated]"

type runError struct {
	code    Code
	summary string
	cause   error
}

func (e *runError) Error() string {
	if e.cause == nil {
		return e.summary
	}
	return e.summary + ": " + e.cause.Error()
}

func (e *runError) Unwrap() error { return e.cause }

// CodeOf returns err's stable code, or Internal for an unclassified error.
func CodeOf(err error) Code {
	var run *runError
	if errors.As(err, &run) {
		return run.code
	}
	return Internal
}

// PublicMessage returns err's safe public summary without its diagnostic cause.
func PublicMessage(err error) string {
	var run *runError
	if errors.As(err, &run) {
		return run.summary
	}
	return "python runtime failed"
}

// Detail returns err's bounded diagnostic for private logs and protocol traffic.
func Detail(err error) string { return truncateDetail(err.Error()) }

// New creates an error with a stable code, sanitized public summary, and
// bounded private diagnostic cause.
func New(code Code, summary string, cause error) error {
	return &runError{
		code:    code,
		summary: public(summary),
		cause:   boundedCause(cause),
	}
}

// Invalid creates an InvalidArgument error.
func Invalid(summary string, cause error) error {
	return New(InvalidArgument, summary, cause)
}

// Failed creates a FailedPrecondition error.
func Failed(summary string, cause error) error {
	return New(FailedPrecondition, summary, cause)
}

// CanceledError creates a Canceled error with the standard public summary.
func CanceledError(cause error) error {
	return New(Canceled, "python execution was canceled", cause)
}

// Deadline creates a DeadlineExceeded error with the standard public summary.
func Deadline(cause error) error {
	return New(DeadlineExceeded, "python execution timed out", cause)
}

// Exhausted creates a ResourceExhausted error.
func Exhausted(summary string, cause error) error {
	return New(ResourceExhausted, summary, cause)
}

// UnavailableError creates an Unavailable error.
func UnavailableError(summary string, cause error) error {
	return New(Unavailable, summary, cause)
}

// InternalError creates an Internal error with the standard public summary.
func InternalError(cause error) error {
	return New(Internal, "python runtime failed", cause)
}

// ContextError maps a context cancellation or deadline error to a runner code.
func ContextError(err error) error {
	if errors.Is(err, context.Canceled) {
		return CanceledError(err)
	}
	return Deadline(err)
}

func public(summary string) string {
	summary = strings.Join(strings.Fields(strings.ToValidUTF8(summary, "")), " ")
	if summary == "" {
		return "python runtime failed"
	}
	runes := []rune(summary)
	if len(runes) > maxPublicRunes {
		return string(runes[:maxPublicRunes-1]) + "…"
	}
	return summary
}

func boundedCause(cause error) error {
	if cause == nil {
		return nil
	}
	if len(cause.Error()) <= MaxDetailBytes {
		return cause
	}
	return truncatedCause{detail: truncateDetail(cause.Error()), cause: cause}
}

func truncateDetail(detail string) string {
	if len(detail) <= MaxDetailBytes {
		return detail
	}
	limit := MaxDetailBytes - len(detailTruncationMarker)
	if limit < 0 {
		limit = 0
	}
	return detail[:limit] + detailTruncationMarker
}

type truncatedCause struct {
	detail string
	cause  error
}

func (e truncatedCause) Error() string { return e.detail }

func (e truncatedCause) Unwrap() error { return e.cause }
