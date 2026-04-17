package api

import (
	"context"
	"time"

	"go.uber.org/zap"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/plural"
)

const (
	defaultAuditLogQueueSize = 1024
	auditLogWriteTimeout     = 30 * time.Second
)

type AuditLogEvent struct {
	Token     string
	ClusterID string
	Method    string
	Path      string
}

type auditLogEventKey struct {
	clusterID string
	method    string
	path      string
}

type auditLogTokenBucket struct {
	token  string
	events map[auditLogEventKey]AuditLogEvent
}

type AuditLogBatcher struct {
	log          *zap.Logger
	pluralURL    string
	flushEvery   time.Duration
	flushAt      int
	drainTimeout time.Duration

	queue    chan AuditLogEvent
	flushNow chan struct{}
}

func NewAuditLogBatcher(log *zap.Logger, pluralURL string, flushEvery, drainTimeout time.Duration, flushAt int) *AuditLogBatcher {
	return &AuditLogBatcher{
		log:          log,
		pluralURL:    pluralURL,
		flushEvery:   flushEvery,
		flushAt:      flushAt,
		drainTimeout: drainTimeout,
		queue:        make(chan AuditLogEvent, defaultAuditLogQueueSize),
		flushNow:     make(chan struct{}, 1),
	}
}

func (b *AuditLogBatcher) Enqueue(event AuditLogEvent) {
	if event.Token == "" || event.ClusterID == "" || event.Method == "" || event.Path == "" {
		return
	}

	select {
	case b.queue <- event:
	default:
		b.log.Warn("Dropping audit event because the queue is full")
	}
}

func (b *AuditLogBatcher) Run(ctx context.Context) {
	go b.run(ctx)
}

func (b *AuditLogBatcher) run(ctx context.Context) {
	ticker := time.NewTicker(b.flushEvery)
	defer ticker.Stop()

	buckets := make(map[string]*auditLogTokenBucket)
	totalEvents := 0

	flush := func() {
		totalEvents = b.flush(buckets, totalEvents)
	}
	addEvent := func(event AuditLogEvent) {
		var shouldFlush bool
		totalEvents, shouldFlush = addAuditLogEventToBuckets(buckets, totalEvents, event)

		// Trigger immediate flush if we've reached the flushAt threshold'
		if shouldFlush && totalEvents >= b.flushAt {
			select {
			case b.flushNow <- struct{}{}:
			default:
			}
		}
	}

	for {
		select {
		case <-ctx.Done():
			for {
				select {
				case event := <-b.queue:
					addEvent(event)
				default:
					goto drain
				}
			}
		drain:
			deadline := time.Now().Add(b.drainTimeout)
			for totalEvents > 0 && time.Now().Before(deadline) {
				flush()
			}
			if totalEvents > 0 {
				b.log.Warn("Dropping buffered audit events due to shutdown drain timeout", zap.Int("remaining_events", totalEvents))
			}
			return
		case event := <-b.queue:
			addEvent(event)
		case <-ticker.C:
			b.log.Debug("Flushing audit logs on regular interval", zap.Int("total_events", totalEvents))
			flush()
		case <-b.flushNow:
			b.log.Debug("Reached totalEvents threshold, flushing audit logs", zap.Int("total_events", totalEvents))
			flush()
		}
	}
}

func addAuditLogEventToBuckets(buckets map[string]*auditLogTokenBucket, totalEvents int, event AuditLogEvent) (int, bool) {
	bucket, ok := buckets[event.Token]
	if !ok {
		bucket = &auditLogTokenBucket{
			token:  event.Token,
			events: make(map[auditLogEventKey]AuditLogEvent),
		}
		buckets[event.Token] = bucket
	}
	key := auditLogEventKey{
		clusterID: event.ClusterID,
		method:    event.Method,
		path:      event.Path,
	}
	if _, exists := bucket.events[key]; exists {
		return totalEvents, false
	}

	bucket.events[key] = event
	return totalEvents + 1, true
}

func (b *AuditLogBatcher) flush(buckets map[string]*auditLogTokenBucket, totalEvents int) int {
	for token, bucket := range buckets {
		client := plural.New(b.pluralURL, token)
		for key, event := range bucket.events {
			callCtx, cancel := context.WithTimeout(context.Background(), auditLogWriteTimeout)
			b.log.Debug("writing audit log",
				zap.String("cluster_id", event.ClusterID),
				zap.String("method", event.Method),
				zap.String("path", event.Path),
			)
			_, err := client.Console.AddClusterAuditLog(callCtx, console.ClusterAuditAttributes{
				ClusterID: event.ClusterID,
				Method:    event.Method,
				Path:      event.Path,
			})
			cancel()
			if err != nil {
				b.log.Error("failed to write audit log",
					zap.Error(err),
					zap.String("cluster_id", event.ClusterID),
					zap.String("method", event.Method),
					zap.String("path", event.Path),
				)

				continue
			}

			delete(bucket.events, key)
			totalEvents--
		}

		if len(bucket.events) == 0 {
			delete(buckets, token)
		}
	}

	return totalEvents
}
