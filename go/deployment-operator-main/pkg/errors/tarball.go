package errors

import (
	"errors"
	"fmt"
)

var ErrWarning = errors.New("warning")

func IsWarning(err error) bool {
	if err == nil {
		return false
	}

	return errors.Is(err, ErrWarning)
}

type DigestMismatchError struct {
	Expected string
	Actual   string
}

func (e *DigestMismatchError) Error() string {
	return fmt.Sprintf("%v: tarball sha mismatch: expected %s, actual %s", ErrWarning, e.Expected, e.Actual)
}

func (e *DigestMismatchError) Is(target error) bool {
	return target == ErrWarning
}

func NewDigestMismatchError(expected, actual string) error {
	return &DigestMismatchError{Expected: expected, Actual: actual}
}
