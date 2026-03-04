package algorithms

import (
	"time"

	"github.com/cenkalti/backoff"
)

func Retry(op func() error, maxTries uint64) (err error) {
	b := backoff.NewExponentialBackOff()
	br := withMaxRetries(b, maxTries)
	return backoff.Retry(op, br)
}

func withMaxRetries(b backoff.BackOff, max uint64) backoff.BackOff {
	return &backOffTries{delegate: b, maxTries: max}
}

type backOffTries struct {
	delegate backoff.BackOff
	maxTries uint64
	numTries uint64
}

func (b *backOffTries) NextBackOff() time.Duration {
	if b.maxTries > 0 {
		b.numTries++
		if b.maxTries <= b.numTries {
			return backoff.Stop
		}
	}
	return b.delegate.NextBackOff()
}

func (b *backOffTries) Reset() {
	b.numTries = 0
	b.delegate.Reset()
}
