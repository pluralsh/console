package tunnel

import (
	"context"
	"fmt"
	"sync"
	"time"

	"go.uber.org/zap"

	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/retry"
)

type pollingState byte

const (
	stopped pollingState = iota
	running
)

// PollKasUrlsByAgentIdCallback is called periodically with found kas URLs for a particular agent id.
type PollKasUrlsByAgentIdCallback func(kasUrls []string)

type PollingQuerier interface {
	PollKasUrlsByAgentId(ctx context.Context, agentId int64, cb PollKasUrlsByAgentIdCallback)
	CachedKasUrlsByAgentId(agentId int64) []string
}

type pollConsumer struct {
	ctxDone  <-chan struct{}
	kasUrlsC chan<- []string
}

type pollingContext struct {
	mu        sync.Mutex
	consumers map[*pollConsumer]struct{}
	cancel    context.CancelFunc
	kasUrls   []string
	stoppedAt time.Time
	state     pollingState
}

func newPollingContext() *pollingContext {
	return &pollingContext{
		consumers: map[*pollConsumer]struct{}{},
		state:     stopped,
	}
}

func (c *pollingContext) copyConsumersInto(consumers []pollConsumer) []pollConsumer {
	consumers = consumers[:0]
	c.mu.Lock()
	defer c.mu.Unlock()
	for h := range c.consumers {
		consumers = append(consumers, *h)
	}
	return consumers
}

func (c *pollingContext) setKasUrls(kasUrls []string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.kasUrls = kasUrls
}

func (c *pollingContext) isExpired(before time.Time) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.state == stopped && c.stoppedAt.Before(before)
}

// AggregatingQuerier groups polling requests.
type AggregatingQuerier struct {
	log        *zap.Logger
	delegate   Querier
	api        modshared.Api
	pollConfig retry.PollConfigFactory
	gcPeriod   time.Duration

	mu        sync.Mutex
	listeners map[int64]*pollingContext
}

func NewAggregatingQuerier(log *zap.Logger, delegate Querier, api modshared.Api, pollConfig retry.PollConfigFactory, gcPeriod time.Duration) *AggregatingQuerier {
	return &AggregatingQuerier{
		log:        log,
		delegate:   delegate,
		api:        api,
		pollConfig: pollConfig,
		gcPeriod:   gcPeriod,
		listeners:  make(map[int64]*pollingContext),
	}
}

func (q *AggregatingQuerier) Run(ctx context.Context) error {
	done := ctx.Done()
	t := time.NewTicker(q.gcPeriod)
	defer t.Stop()
	for {
		select {
		case <-done:
			return nil
		case <-t.C:
			q.runGc()
		}
	}
}

func (q *AggregatingQuerier) runGc() {
	before := time.Now().Add(-q.gcPeriod)
	q.mu.Lock()
	defer q.mu.Unlock()
	for agentId, pc := range q.listeners {
		if pc.isExpired(before) {
			delete(q.listeners, agentId)
		}
	}
}

func (q *AggregatingQuerier) PollKasUrlsByAgentId(ctx context.Context, agentId int64, cb PollKasUrlsByAgentIdCallback) {
	kasUrlsC := make(chan []string)
	ctxDone := ctx.Done()
	h := &pollConsumer{
		ctxDone:  ctxDone,
		kasUrlsC: kasUrlsC,
	}
	q.maybeStartPolling(agentId, h) // nolint: contextcheck
	defer q.maybeStopPolling(agentId, h)
	for {
		select {
		case <-ctxDone:
			return
		case kasUrls := <-kasUrlsC:
			cb(kasUrls)
		}
	}
}

func (q *AggregatingQuerier) CachedKasUrlsByAgentId(agentId int64) []string {
	q.mu.Lock()
	defer q.mu.Unlock()
	pc := q.listeners[agentId]
	if pc == nil { // no existing context
		return nil
	}
	pc.mu.Lock()
	defer pc.mu.Unlock()
	return pc.kasUrls
}

func (q *AggregatingQuerier) maybeStartPolling(agentId int64, h *pollConsumer) {
	q.mu.Lock()
	defer q.mu.Unlock()
	pc := q.listeners[agentId]
	if pc == nil { // no existing context
		pc = newPollingContext()
		q.listeners[agentId] = pc
	}
	q.registerConsumerLocked(agentId, pc, h)
}

func (q *AggregatingQuerier) registerConsumerLocked(agentId int64, pc *pollingContext, h *pollConsumer) {
	pc.mu.Lock()
	defer pc.mu.Unlock()
	pc.consumers[h] = struct{}{} // register for notifications
	switch pc.state {
	case stopped:
		pc.state = running
		ctx, cancel := context.WithCancel(context.Background())
		pc.cancel = cancel
		go q.poll(ctx, agentId, pc)
	case running:
		// Already polling, nothing to do.
	default:
		panic(fmt.Sprintf("invalid state value: %d", pc.state))
	}
}

func (q *AggregatingQuerier) maybeStopPolling(agentId int64, h *pollConsumer) {
	q.mu.Lock()
	defer q.mu.Unlock()

	pc := q.listeners[agentId]
	if q.unregisterConsumerLocked(pc, h) {
		// No point in keeping this pollingContext around if it doesn't have any cached URLs.
		delete(q.listeners, agentId)
	}
}

func (q *AggregatingQuerier) unregisterConsumerLocked(pc *pollingContext, h *pollConsumer) bool {
	pc.mu.Lock()
	defer pc.mu.Unlock()

	delete(pc.consumers, h)
	if len(pc.consumers) == 0 {
		pc.cancel()     // stop polling
		pc.cancel = nil // release the kraken! err... GC
		pc.state = stopped
		pc.stoppedAt = time.Now()
		return len(pc.kasUrls) == 0
	}
	return false
}

func (q *AggregatingQuerier) poll(ctx context.Context, agentId int64, pc *pollingContext) {
	var consumers []pollConsumer                                                                            // reuse slice between polls
	_ = retry.PollWithBackoff(ctx, q.pollConfig(), func(ctx context.Context) (error, retry.AttemptResult) { // nolint:staticcheck
		kasUrls, err := q.delegate.KasUrlsByAgentId(ctx, agentId)
		if err != nil {
			q.api.HandleProcessingError(ctx, q.log, agentId, "KasUrlsByAgentId() failed", err)
			// fallthrough
		}
		if len(kasUrls) > 0 {
			consumers = pc.copyConsumersInto(consumers)
			for _, h := range consumers {
				select {
				case <-h.ctxDone:
					// This PollKasUrlsByAgentId() invocation is no longer interested in being called. Ignore it.
				case h.kasUrlsC <- kasUrls:
					// Data sent.
				}
			}
		}
		if err != nil && len(kasUrls) == 0 {
			// if there was an error, and we failed to retrieve any kas URLs from Redis, we don't want to erase the
			// cache. So, no-op here.
		} else {
			pc.setKasUrls(kasUrls)
		}
		return nil, retry.Continue
	})
}
