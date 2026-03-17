package console

import (
	"context"
	"fmt"
	"sync"
	"time"

	pb "github.com/pluralsh/console/go/observability-proxy/internal/proto"
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
	config    ObservabilityConfig
	hasConfig bool
	updatedAt time.Time
}

func NewCachingProvider(client Client, ttl time.Duration) *CachingProvider {
	return &CachingProvider{client: client, ttl: ttl}
}

func (p *CachingProvider) Ready() bool {
	p.mu.RLock()
	defer p.mu.RUnlock()

	return p.hasConfig
}

func (p *CachingProvider) GetConfig(ctx context.Context) (ObservabilityConfig, error) {
	p.mu.RLock()
	if p.hasConfig && time.Since(p.updatedAt) < p.ttl {
		cfg := p.config
		p.mu.RUnlock()
		return cfg, nil
	}
	p.mu.RUnlock()

	fresh, err := p.refresh(ctx)
	if err != nil {
		p.mu.RLock()
		defer p.mu.RUnlock()
		if p.hasConfig {
			return p.config, nil
		}
		return ObservabilityConfig{}, err
	}

	return fresh, nil
}

func (p *CachingProvider) refresh(ctx context.Context) (ObservabilityConfig, error) {
	resp, err := p.client.GetObservabilityConfig(ctx)
	if err != nil {
		return ObservabilityConfig{}, err
	}

	cfg, err := fromProto(resp)
	if err != nil {
		return ObservabilityConfig{}, err
	}

	p.mu.Lock()
	p.config = cfg
	p.hasConfig = true
	p.updatedAt = time.Now()
	p.mu.Unlock()

	return cfg, nil
}

func fromProto(resp *pb.ObservabilityConfig) (ObservabilityConfig, error) {
	if resp == nil {
		return ObservabilityConfig{}, fmt.Errorf("empty observability config")
	}

	cfg := ObservabilityConfig{
		PrometheusHost:     resp.GetPrometheusHost(),
		PrometheusUsername: resp.GetPrometheusUsername(),
		PrometheusPassword: resp.GetPrometheusPassword(),
		ElasticHost:        resp.GetElasticHost(),
		ElasticUsername:    resp.GetElasticUsername(),
		ElasticPassword:    resp.GetElasticPassword(),
		ElasticIndex:       resp.GetElasticIndex(),
	}

	if cfg.PrometheusHost == "" {
		return ObservabilityConfig{}, fmt.Errorf("missing prometheusHost")
	}
	if cfg.ElasticHost == "" {
		return ObservabilityConfig{}, fmt.Errorf("missing elasticHost")
	}

	return cfg, nil
}
