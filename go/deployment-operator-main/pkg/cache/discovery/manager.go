package discovery

import (
	"context"
	"fmt"
	"sync"
	"time"

	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/metrics"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

const defaultRefreshInterval = 5 * time.Minute

// Manager is a discovery cache manager. It is responsible for refreshing the cache periodically.
type Manager interface {
	// Start starts the discovery cache manager. The first run is synchronous,
	// meaning that it will block until the first refresh is completed.
	Start(context.Context) error

	// Stop stops the discovery cache manager.
	Stop()
}

type manager struct {
	started bool
	cancel  context.CancelCauseFunc
	mu      sync.RWMutex

	// refreshInterval is the interval at which the discovery cache is refreshed.
	refreshInterval time.Duration

	// cache is the discovery cache. If not provided, the global cache is used.
	cache Cache
}

func (in *manager) Start(ctx context.Context) error {
	in.mu.Lock()

	if in.started {
		in.mu.Unlock()
		return fmt.Errorf("discovery cache already started")
	}

	in.started = true
	internalCtx, cancel := context.WithCancelCause(ctx)
	in.cancel = cancel
	in.mu.Unlock()

	klog.V(log.LogLevelInfo).InfoS("starting discovery cache manager", "refreshInterval", in.refreshInterval)
	return in.start(internalCtx)
}

func (in *manager) start(ctx context.Context) error {
	err := in.cache.Refresh()

	go func() {
		_ = wait.PollUntilContextCancel(ctx, in.refreshInterval, false, func(_ context.Context) (bool, error) {
			if err = in.cache.Refresh(); err != nil {
				klog.V(log.LogLevelExtended).ErrorS(err, "failed to refresh discovery cache")
			}

			metrics.Record().DiscoveryAPICacheRefresh(err)

			// We want to always poll even if we get an error
			return false, nil
		})
	}()

	return err
}

func (in *manager) Stop() {
	in.mu.Lock()
	defer in.mu.Unlock()

	if !in.started {
		return
	}

	in.cancel(fmt.Errorf("stop called on discovery cache manager"))
	in.started = false
}

type ManagerOption func(*manager)

// WithRefreshInterval sets the refresh interval for the discovery manager.
func WithRefreshInterval(refreshInterval time.Duration) ManagerOption {
	return func(in *manager) {
		in.refreshInterval = refreshInterval

		if refreshInterval < defaultRefreshInterval {
			klog.V(log.LogLevelInfo).InfoS(
				"refresh interval is too short, setting to default",
				"refreshInterval", in.refreshInterval,
				"defaultRefreshInterval", defaultRefreshInterval,
			)
			in.refreshInterval = defaultRefreshInterval
		}
	}
}

// WithCache sets the cache to use for the discovery manager. If not provided, the global cache is used.
func WithCache(cache Cache) ManagerOption {
	return func(in *manager) {
		in.cache = cache
	}
}

func NewDiscoveryManager(option ...ManagerOption) Manager {
	result := &manager{
		refreshInterval: defaultRefreshInterval,
	}

	for _, opt := range option {
		opt(result)
	}

	if result.cache == nil {
		klog.V(log.LogLevelDefault).InfoS("no cache provided, using global discovery cache")
		result.cache = GlobalCache()
	}

	return result
}
