package output

import (
	"bytes"
	"context"
	"sync"
	"time"

	console "github.com/pluralsh/console/go/client"
	client "github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"k8s.io/klog/v2"
)

const (
	defaultFlushInterval = 5 * time.Second
	defaultFlushTimeout  = 10 * time.Second
	defaultSizeLimit     = 4096
)

// Streamer buffers incremental tool stdout and flushes to Console when either
// the flush interval elapses or the pending buffer reaches sizeLimit. Delivery
// is best-effort and at-most-once because the API has no idempotency token.
type Streamer struct {
	ctx           context.Context
	client        client.Client
	flushInterval time.Duration
	flushTimeout  time.Duration
	sizeLimit     int

	mu sync.Mutex
	// streams holds one entry per tool call. A nil value marks a call that has
	// already been closed, so late output cannot revive its stream.
	streams map[string]*stream
	closed  bool
}

type stream struct {
	mu        sync.Mutex
	ctx       context.Context
	cancel    context.CancelFunc
	messageID string
	seen      int
	buf       bytes.Buffer
	closed    bool
	stop      chan struct{}
	done      chan struct{}
}

func (st *stream) close() {
	st.cancel()
	st.mu.Lock()
	defer st.mu.Unlock()
	st.closed = true
}

func New(ctx context.Context, consoleClient client.Client) *Streamer {
	return &Streamer{
		ctx:           ctx,
		client:        consoleClient,
		flushInterval: defaultFlushInterval,
		flushTimeout:  defaultFlushTimeout,
		sizeLimit:     defaultSizeLimit,
		streams:       make(map[string]*stream),
	}
}

func (s *Streamer) WithFlushInterval(d time.Duration) *Streamer {
	if d > 0 {
		s.flushInterval = d
	}
	return s
}

func (s *Streamer) WithSizeLimit(n int) *Streamer {
	if n > 0 {
		s.sizeLimit = n
	}
	return s
}

// Write records accumulated tool stdout for callID. Only the suffix not yet
// seen is buffered. Empty suffixes are ignored. seen tracks the consumed
// byte count so the streamer does not retain the full accumulated payload.
func (s *Streamer) Write(callID, messageID, accumulated string) {
	if callID == "" || messageID == "" || accumulated == "" {
		return
	}

	st := s.ensure(callID, messageID)
	if st == nil {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()
	if st.closed {
		return
	}

	if len(accumulated) < st.seen {
		klog.InfoS("ignoring regressed accumulated agent message output", "messageID", st.messageID, "previousBytes", st.seen, "currentBytes", len(accumulated))
		return
	}
	delta := accumulated[st.seen:]
	st.seen = len(accumulated)
	if delta == "" {
		return
	}

	st.buf.WriteString(delta)
	if st.buf.Len() >= s.sizeLimit {
		s.flushLocked(st.ctx, st)
	}
}

// Close flushes remaining output for callID and stops its watcher.
func (s *Streamer) Close(callID string) {
	s.mu.Lock()
	st := s.streams[callID]
	s.streams[callID] = nil
	s.mu.Unlock()
	if st == nil {
		return
	}
	st.close()
	close(st.stop)
	<-st.done
	ctx, cancel := s.finalContext()
	defer cancel()
	s.flushFinal(ctx, st)
}

// CloseAll flushes and stops every active stream.
func (s *Streamer) CloseAll() {
	s.mu.Lock()
	streams := make([]*stream, 0, len(s.streams))
	for _, st := range s.streams {
		if st != nil {
			streams = append(streams, st)
		}
	}
	s.streams = make(map[string]*stream)
	s.closed = true
	s.mu.Unlock()

	// Stop every watcher before waiting so the streams shut down concurrently.
	for _, st := range streams {
		st.close()
		close(st.stop)
	}
	for _, st := range streams {
		<-st.done
	}

	ctx, cancel := s.finalContext()
	defer cancel()
	var wg sync.WaitGroup
	for _, st := range streams {
		wg.Go(func() {
			s.flushFinal(ctx, st)
		})
	}
	wg.Wait()
}

func (s *Streamer) flushFinal(ctx context.Context, st *stream) {
	st.mu.Lock()
	defer st.mu.Unlock()
	s.flushLocked(ctx, st)
}

func (s *Streamer) ensure(callID, messageID string) *stream {
	s.mu.Lock()
	defer s.mu.Unlock()
	if st, ok := s.streams[callID]; ok {
		return st
	}
	if s.closed {
		return nil
	}
	ctx, cancel := context.WithCancel(s.ctx)
	st := &stream{
		ctx:       ctx,
		cancel:    cancel,
		messageID: messageID,
		stop:      make(chan struct{}),
		done:      make(chan struct{}),
	}
	s.streams[callID] = st
	go s.watch(st)
	return st
}

func (s *Streamer) watch(st *stream) {
	defer close(st.done)
	ticker := time.NewTicker(s.flushInterval)
	defer ticker.Stop()
	for {
		select {
		case <-st.stop:
			// The closer flushes once this watcher has exited.
			return
		case <-s.ctx.Done():
			st.mu.Lock()
			if !st.closed {
				ctx, cancel := s.finalContext()
				s.flushLocked(ctx, st)
				cancel()
			}
			st.mu.Unlock()
			return
		case <-ticker.C:
			st.mu.Lock()
			s.flushLocked(st.ctx, st)
			st.mu.Unlock()
		}
	}
}

func (s *Streamer) finalContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.WithoutCancel(s.ctx), s.flushTimeout)
}

func (s *Streamer) flushLocked(parent context.Context, st *stream) {
	n := st.buf.Len()
	if n <= 0 || st.messageID == "" || s.client == nil {
		return
	}
	chunk := st.buf.String()
	st.buf = bytes.Buffer{}
	ctx, cancel := context.WithTimeout(parent, s.flushTimeout)
	defer cancel()
	err := s.client.AgentMessageOutput(ctx, console.AgentMessageOutputAttributes{
		MessageID: st.messageID,
		Stdout:    new(chunk),
	})
	if err != nil {
		klog.ErrorS(err, "failed to flush agent message output", "messageID", st.messageID, "bytes", n)
		return
	}
	klog.V(log.LogLevelTrace).InfoS("flushed agent message output", "messageID", st.messageID, "bytes", n)
}
