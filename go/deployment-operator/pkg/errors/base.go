package errors

import (
	"errors"
)

var ErrExpected = errors.New("this is a transient, expected error")
