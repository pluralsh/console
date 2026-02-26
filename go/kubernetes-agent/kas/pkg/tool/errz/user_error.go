package errz

import "fmt"

// UserError is an error that happened because the user messed something up:
// - invalid syntax
// - invalid configuration
type UserError struct {
	// Message is a textual description of what's wrong.
	// Must be suitable to show to the user.
	Message string
	// Cause optionally holds an underlying error.
	Cause error
}

func NewUserError(msg string) error {
	return UserError{
		Message: msg,
	}
}

func NewUserErrorf(format string, args ...interface{}) error {
	return NewUserError(fmt.Sprintf(format, args...))
}

func NewUserErrorWithCause(cause error, msg string) error {
	return UserError{
		Message: msg,
		Cause:   cause,
	}
}

func NewUserErrorWithCausef(cause error, format string, args ...interface{}) error {
	return NewUserErrorWithCause(cause, fmt.Sprintf(format, args...))
}

func (e UserError) Error() string {
	if e.Cause == nil {
		return e.Message
	}
	if e.Message == "" {
		return e.Cause.Error()
	}
	return fmt.Sprintf("%s: %v", e.Message, e.Cause)
}

func (e UserError) Unwrap() error {
	return e.Cause
}
