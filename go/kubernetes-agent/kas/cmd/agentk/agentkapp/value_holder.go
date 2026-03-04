package agentkapp

import (
	"context"
	"fmt"
)

// ValueHolder holds agent id of this agentk.
type ValueHolder[T comparable] struct {
	value T
	setC  chan struct{}
}

func NewValueHolder[T comparable]() *ValueHolder[T] {
	return &ValueHolder[T]{
		setC: make(chan struct{}),
	}
}

// set is not safe for concurrent use. It's ok since we don't need that.
func (a *ValueHolder[T]) set(value T) error {
	select {
	case <-a.setC: // already set
		if a.value != value {
			return fmt.Errorf("value is already set to a different value: old %v, new %v", a.value, value)
		}
	default: // not set
		a.value = value
		close(a.setC)
	}
	return nil
}

func (a *ValueHolder[T]) get(ctx context.Context) (T, error) {
	select {
	case <-a.setC:
		return a.value, nil
	case <-ctx.Done():
		var t T // nil
		return t, ctx.Err()
	}
}

func (a *ValueHolder[T]) tryGet() (T, bool) {
	select {
	case <-a.setC:
		return a.value, true
	default:
		var t T // nil
		return t, false
	}
}
