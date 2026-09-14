package console

import (
	"context"
	"sync"
	"time"

	"github.com/pluralsh/console/go/nexus/internal/log"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
	"go.uber.org/zap"
)

type clientCache struct {
	logger       *zap.Logger
	mu           sync.RWMutex
	config       *pb.AiConfig
	configGetter func(_ context.Context) (*pb.AiConfig, error)
	ttl          time.Duration
	updated      time.Time
}

func (in *clientCache) GetAiConfig(ctx context.Context) (*pb.AiConfig, error) {
	in.mu.RLock()
	config, age, ok := in.cachedConfigLocked()
	in.mu.RUnlock()
	if ok {
		in.logger.Debug("returning cached AI config", zap.Duration("ttl", in.ttl), zap.Duration("age", age))
		return config, nil
	}

	in.mu.Lock()
	defer in.mu.Unlock()

	// Another caller may have refreshed the cache while this caller waited.
	if config, age, ok := in.cachedConfigLocked(); ok {
		in.logger.Debug("returning cached AI config", zap.Duration("ttl", in.ttl), zap.Duration("age", age))
		return config, nil
	}

	in.logger.Debug("fetching new AI config from Console")
	aiConfig, err := in.configGetter(ctx)
	if err != nil {
		return nil, err
	}

	in.config = aiConfig
	in.updated = time.Now()

	return aiConfig, nil
}

// cachedConfigLocked must be called while holding either mu's read or write lock.
func (in *clientCache) cachedConfigLocked() (*pb.AiConfig, time.Duration, bool) {
	age := time.Since(in.updated)
	return in.config, age, in.config != nil && age < in.ttl
}

func newClientCache(getter func(_ context.Context) (*pb.AiConfig, error), ttl time.Duration) *clientCache {
	return &clientCache{
		logger:       log.Logger().With(zap.String("component", "console-client-cache")),
		configGetter: getter,
		ttl:          ttl,
	}
}
