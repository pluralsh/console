//go:build !linux

package main

import (
	"errors"
	"time"
)

func fsBirthTime(string) (time.Time, error) {
	return time.Time{}, errors.ErrUnsupported
}
