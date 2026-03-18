package console

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/pluralsh/console/go/observability-proxy/internal/logging"
	pb "github.com/pluralsh/console/go/observability-proxy/internal/proto"
	"golang.org/x/sync/singleflight"
	"k8s.io/klog/v2"
)

// ObservabilityConfig is the normalized upstream configuration used by the proxy.
type ObservabilityConfig struct {
	PrometheusHost     string
	PrometheusUsername string
	PrometheusPassword string
	ElasticHost        string
	ElasticUsername    string
	ElasticPassword    string
	ElasticIndex       string
}

// ConfigProvider serves cached ObservabilityConfig values backed by Console gRPC.
type ConfigProvider interface {
	GetConfig(ctx context.Context) (ObservabilityConfig, error)
	Ready() bool
}

type CachingProvider struct {
	client Client
	ttl    time.Duration

	mu        sync.RWMutex
	config    *ObservabilityConfig
	sfGroup   singleflight.Group
	updatedAt time.Time
}

func NewCachingProvider(client Client, ttl time.Duration) *CachingProvider {
	return &CachingProvider{client: client, ttl: ttl}
}

func (p *CachingProvider) Ready() bool {
	p.mu.RLock()
	defer p.mu.RUnlock()

	return p.config != nil && time.Since(p.updatedAt) < p.ttl
}

func (p *CachingProvider) GetConfig(_ context.Context) (ObservabilityConfig, error) {
	p.mu.RLock()
	if p.config != nil && time.Since(p.updatedAt) < p.ttl {
		cfg := *p.config
		p.mu.RUnlock()
		return cfg, nil
	}
	p.mu.RUnlock()

	// singleflight ensures that only one refresh is in flight at a time
	val, err, _ := p.sfGroup.Do("refresh", func() (interface{}, error) {
		err := p.refresh(context.Background())
		if err != nil {
			return nil, err
		}

		p.mu.RLock()
		cfg := *p.config
		p.mu.RUnlock()

		return cfg, nil
	})

	if err != nil {
		// fallback to cached config if refresh failed
		p.mu.RLock()
		cfg := p.config
		p.mu.RUnlock()
		if cfg != nil {
			return *cfg, nil
		}

		return ObservabilityConfig{}, err
	}

	return val.(ObservabilityConfig), nil
}

func (p *CachingProvider) refresh(ctx context.Context) error {
	resp, err := p.client.GetObservabilityConfig(ctx)
	if err != nil {
		klog.ErrorS(err, "failed to refresh observability config")
		return err
	}

	cfg, err := p.fromProto(resp)
	if err != nil {
		klog.ErrorS(err, "failed to parse observability config")
		return err
	}

	p.mu.Lock()
	p.config = cfg
	p.updatedAt = time.Now()
	p.mu.Unlock()

	return nil
}

func (p *CachingProvider) fromProto(resp *pb.ObservabilityConfig) (*ObservabilityConfig, error) {
	if resp == nil {
		return nil, fmt.Errorf("empty observability config")
	}

	klog.V(logging.LevelDebug).InfoS("received observability config",
		"prometheusHost", resp.GetPrometheusHost(),
		"elasticHost", resp.GetElasticHost(),
	)

	cfg := &ObservabilityConfig{
		PrometheusHost:     resp.GetPrometheusHost(),
		PrometheusUsername: resp.GetPrometheusUsername(),
		PrometheusPassword: resp.GetPrometheusPassword(),
		ElasticHost:        resp.GetElasticHost(),
		ElasticUsername:    resp.GetElasticUsername(),
		ElasticPassword:    resp.GetElasticPassword(),
		ElasticIndex:       resp.GetElasticIndex(),
	}

	if len(cfg.PrometheusHost) == 0 && len(cfg.ElasticHost) == 0 {
		return nil, fmt.Errorf("missing observability config")
	}

	return cfg, nil
}
