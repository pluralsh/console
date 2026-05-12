package metering

import (
	"context"
	"sync/atomic"
	"time"

	"github.com/pluralsh/console/go/observability-proxy/internal/logging"
	"k8s.io/klog/v2"
)

// Client sends metering usage to Console.
type Client interface {
	MeterMetrics(ctx context.Context, bytes int64) error
}

// UsageReporter aggregates request bytes and periodically flushes them to Console.
type UsageReporter struct {
	client   Client
	interval time.Duration
	bytes    atomic.Int64
}

func NewUsageReporter(client Client, interval time.Duration) *UsageReporter {
	return &UsageReporter{
		client:   client,
		interval: interval,
	}
}

func (r *UsageReporter) AddBytes(n int64) {
	if n <= 0 {
		return
	}

	klog.V(logging.LevelDebug).Infof("metering bytes=%d", n)
	r.bytes.Add(n)
}

func (r *UsageReporter) Start(ctx context.Context) {
	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			r.flush(ctx)
		case <-ctx.Done():
			r.flush(context.Background())
			return
		}
	}
}

func (r *UsageReporter) flush(ctx context.Context) {
	n := r.bytes.Swap(0)
	if n <= 0 {
		return
	}

	if err := r.client.MeterMetrics(ctx, n); err != nil {
		r.bytes.Add(n)
		klog.V(logging.LevelInfo).Infof("failed to meter request bytes=%d: %v", n, err)
		return
	}

	klog.V(logging.LevelDebug).Infof("flushed bytes=%d", n)
}
