package syncz

import (
	"math"
)

// StripedValue is a value that is partitioned into 2^n stripes.
// See https://github.com/google/guava/wiki/StripedExplained for a similar idea applied to mutexes.
//
// Number of stripes is a power of two to make it possible to use fast bit operations instead of slow division remainder.
type StripedValue[V any] struct {
	// Stripes holds the stripes.
	Stripes []V
	mask    int64
}

// NewStripedValueInit constructs a new striped value. Each stripe has a value provided by a constructor function.
//
// It's not a pointer because it doesn't contain any non-pointer mutable fields.
func NewStripedValueInit[V any](n int, newV func() V) StripedValue[V] {
	stripes := make([]V, 1<<n)
	for i := range stripes {
		stripes[i] = newV()
	}
	return StripedValue[V]{
		Stripes: stripes,
		// all bits set, shift left by n (i.e. unset lowest n bits), negate/invert (i.e. set lowest n bits only).
		mask: ^(math.MaxInt64 << n),
	}
}

// GetPointer retrieves the pointer to the stripe for x.
func (v *StripedValue[V]) GetPointer(x int64) *V {
	return &v.Stripes[x&v.mask]
}
