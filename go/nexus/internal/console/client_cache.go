package console

import (
	"context"
	"time"

	"github.com/pluralsh/console/go/nexus/internal/log"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
	"go.uber.org/zap"
)

type clientCache struct {
	logger       *zap.Logger
	config       *pb.AiConfig
	configGetter func(_ context.Context) (*pb.AiConfig, error)
	ttl          time.Duration
	updated      time.Time
}

func (in *clientCache) GetAiConfig(ctx context.Context) (*pb.AiConfig, error) {
	if time.Since(in.updated) < in.ttl && in.config != nil {
		in.logger.Debug("returning cached AI config")
		return in.config, nil
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

func newClientCache(getter func(_ context.Context) (*pb.AiConfig, error), ttl time.Duration) *clientCache {
	return &clientCache{
		logger:       log.Logger().With(zap.String("component", "console-client-cache")),
		configGetter: getter,
		ttl:          ttl,
	}
}
