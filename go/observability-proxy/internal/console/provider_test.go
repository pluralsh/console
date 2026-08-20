package console

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	pb "github.com/pluralsh/console/go/observability-proxy/internal/proto"
)

type fakeConfigClient struct {
	mu    sync.Mutex
	calls int
	delay time.Duration
	resp  *pb.ObservabilityConfig
	err   error
}

func (f *fakeConfigClient) GetObservabilityConfig(ctx context.Context) (*pb.ObservabilityConfig, error) {
	f.mu.Lock()
	f.calls++
	delay := f.delay
	resp := f.resp
	err := f.err
	f.mu.Unlock()

	if delay > 0 {
		select {
		case <-time.After(delay):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}

	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (f *fakeConfigClient) MeterMetrics(context.Context, int64) error { return nil }

func (f *fakeConfigClient) Close() error { return nil }

func (f *fakeConfigClient) Calls() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.calls
}

func TestReadyRemainsTrueWhenConfigIsStale(t *testing.T) {
	client := &fakeConfigClient{resp: observabilityProto("http://prom", "http://elastic")}
	provider := NewCachingProvider(client, 10*time.Millisecond)

	if provider.Ready() {
		t.Fatal("provider should not be ready before loading config")
	}
	if _, err := provider.GetConfig(context.Background()); err != nil {
		t.Fatalf("load config: %v", err)
	}

	time.Sleep(15 * time.Millisecond)
	if !provider.Ready() {
		t.Fatal("provider should remain ready while it has a valid cached config")
	}
}

func TestGetConfigDeduplicatesConcurrentColdStartRefresh(t *testing.T) {
	client := &fakeConfigClient{
		delay: 50 * time.Millisecond,
		resp:  observabilityProto("http://prom", "http://elastic"),
	}
	provider := NewCachingProvider(client, time.Minute)

	const goroutines = 20
	var wg sync.WaitGroup
	errCh := make(chan error, goroutines)

	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		go func() {
			defer wg.Done()
			cfg, err := provider.GetConfig(context.Background())
			if err != nil {
				errCh <- err
				return
			}
			if cfg.PrometheusHost != "http://prom" || cfg.ElasticHost != "http://elastic" {
				errCh <- fmt.Errorf("unexpected config returned: %+v", cfg)
			}
		}()
	}

	wg.Wait()
	close(errCh)
	for err := range errCh {
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	}

	if got := client.Calls(); got != 1 {
		t.Fatalf("unexpected grpc call count: got %d want 1", got)
	}
}

func TestGetConfigDeduplicatesConcurrentStaleRefresh(t *testing.T) {
	client := &fakeConfigClient{
		delay: 20 * time.Millisecond,
		resp:  observabilityProto("http://prom", "http://elastic"),
	}
	provider := NewCachingProvider(client, 10*time.Millisecond)

	if _, err := provider.GetConfig(context.Background()); err != nil {
		t.Fatalf("prime cache: %v", err)
	}
	if got := client.Calls(); got != 1 {
		t.Fatalf("unexpected prime grpc call count: got %d want 1", got)
	}

	client.mu.Lock()
	client.delay = 50 * time.Millisecond
	client.mu.Unlock()
	time.Sleep(15 * time.Millisecond) // ensure cache is stale

	const goroutines = 20
	var wg sync.WaitGroup
	errCh := make(chan error, goroutines)

	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		go func() {
			defer wg.Done()
			_, err := provider.GetConfig(context.Background())
			errCh <- err
		}()
	}

	wg.Wait()
	close(errCh)
	for err := range errCh {
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	}

	if got := client.Calls(); got != 2 {
		t.Fatalf("unexpected grpc call count: got %d want 2", got)
	}
}

func TestRefreshBypassesCacheTTL(t *testing.T) {
	client := &fakeConfigClient{resp: observabilityProto("http://prom-v1", "http://elastic")}
	provider := NewCachingProvider(client, time.Hour)

	if _, err := provider.GetConfig(context.Background()); err != nil {
		t.Fatalf("prime config: %v", err)
	}

	client.mu.Lock()
	client.resp = observabilityProto("http://prom-v2", "http://elastic")
	client.mu.Unlock()

	if err := provider.Refresh(context.Background()); err != nil {
		t.Fatalf("refresh config: %v", err)
	}

	cfg, err := provider.GetConfig(context.Background())
	if err != nil {
		t.Fatalf("get refreshed config: %v", err)
	}
	if cfg.PrometheusHost != "http://prom-v2" {
		t.Fatalf("unexpected refreshed host: got %q want %q", cfg.PrometheusHost, "http://prom-v2")
	}
	if got := client.Calls(); got != 2 {
		t.Fatalf("unexpected grpc call count: got %d want 2", got)
	}
}

func observabilityProto(promHost, elasticHost string) *pb.ObservabilityConfig {
	return &pb.ObservabilityConfig{
		PrometheusHost: &promHost,
		ElasticHost:    &elasticHost,
	}
}
