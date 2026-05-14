package errors

import (
	"errors"
	"fmt"
)

var (
	ErrTimeout         = errors.New("timed out")
	ErrRemoteCancel    = errors.New("cancelled remotely")
	ErrNotFound        = errors.New("resource not found")
	ErrTerminated      = errors.New("process has been terminated")
	ErrNoChanges       = errors.New("plan has no changes, skipping run")
	ErrUnauthenticated = errors.New("console token expired or is invalid")
)

func WrapUnauthenticated(action string, err error) error {
	if err == nil {
		return nil
	}

	if len(action) == 0 {
		return fmt.Errorf("%w: %w", ErrUnauthenticated, err)
	}

	return fmt.Errorf("%w: %s: %w", ErrUnauthenticated, action, err)
}
