package syncz

import (
	"context"
	"sync"
)

type EventCallback[E any] func(ctx context.Context, e E)

type sub[E any] struct {
	done <-chan struct{}
	ch   chan<- E
}

type Subscriptions[E any] struct {
	mu   sync.Mutex
	subs []sub[E]
}

func (s *Subscriptions[E]) add(sb sub[E]) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.subs = append(s.subs, sb)
}

func (s *Subscriptions[E]) remove(sb sub[E]) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, c := range s.subs {
		if c == sb {
			l := len(s.subs)
			newChs := append(s.subs[:i], s.subs[i+1:]...) //nolint:all
			s.subs[l-1] = sub[E]{}                        // help GC
			s.subs = newChs
			break
		}
	}
}

func (s *Subscriptions[E]) On(ctx context.Context, cb EventCallback[E]) {
	ch := make(chan E)
	done := ctx.Done()
	sb := sub[E]{
		done: done,
		ch:   ch,
	}
	s.add(sb)
	defer s.remove(sb)

	for {
		select {
		case <-done:
			return
		case e := <-ch:
			cb(ctx, e)
		}
	}
}

// Dispatch dispatches the given event to all added subscriptions.
func (s *Subscriptions[E]) Dispatch(ctx context.Context, e E) {
	done := ctx.Done()

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, sb := range s.subs {
		select {
		case <-done:
			return
		case <-sb.done:
			// It doesn't want the events anymore.
		case sb.ch <- e:
		}
	}
}
