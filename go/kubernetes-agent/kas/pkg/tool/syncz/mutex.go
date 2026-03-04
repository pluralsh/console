package syncz

import "context"

// Mutex is a non-reentrant (like sync.Mutex) mutex that (unlike sync.Mutex) allows to
// acquire the mutex with a possibility to abort the attempt early if a context signals done.
//
// A buffered channel of size 1 is used as the mutex. Think of it as of a box - the party that has put something
// into it has acquired the mutex. To unlock it, remove the contents from the box, so that someone else can use it.
// An empty box is created in the NewMutex() constructor.
//
// TryLock, Lock, and Unlock provide memory access ordering guarantees by piggybacking on channel's "happens before"
// guarantees. See https://golang.org/ref/mem
type Mutex struct {
	box chan struct{}
}

func NewMutex() Mutex {
	return Mutex{
		box: make(chan struct{}, 1), // create an empty box
	}
}

func (m Mutex) TryLock() bool {
	select {
	case m.box <- struct{}{}: // try to put something into the box
		return true
	default: // cannot put immediately, abort
		return false
	}
}

func (m Mutex) Lock(ctx context.Context) bool {
	select {
	case <-ctx.Done(): // abort if context signals done
		return false
	case m.box <- struct{}{}: // try to put something into the box
		return true
	}
}

func (m Mutex) Unlock() {
	<-m.box // take something from the box
}
