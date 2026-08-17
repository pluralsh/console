package main

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/pluralsh/console/go/observability-proxy/internal/console"
	pb "github.com/pluralsh/console/go/observability-proxy/internal/proto"
)

type refreshTestClient struct {
	mu    sync.Mutex
	calls int
	err   error
	resp  *pb.ObservabilityConfig
}

func (c *refreshTestClient) GetObservabilityConfig(context.Context) (*pb.ObservabilityConfig, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.calls++
	return c.resp, c.err
}

func (c *refreshTestClient) MeterMetrics(context.Context, int64) error { return nil }

func (c *refreshTestClient) Close() error { return nil }

func (c *refreshTestClient) Calls() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.calls
}

func (c *refreshTestClient) SetConfig(resp *pb.ObservabilityConfig, err error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.resp = resp
	c.err = err
}

func TestProbesDoNotFetchConfig(t *testing.T) {
	client := &refreshTestClient{err: errors.New("console unavailable")}
	provider := console.NewCachingProvider(client, time.Minute)

	healthRecorder := httptest.NewRecorder()
	healthHandler()(healthRecorder, httptest.NewRequest(http.MethodGet, "/health", nil))
	if healthRecorder.Code != http.StatusOK {
		t.Fatalf("health status: got %d want %d", healthRecorder.Code, http.StatusOK)
	}

	readyRecorder := httptest.NewRecorder()
	readinessHandler(provider)(readyRecorder, httptest.NewRequest(http.MethodGet, "/ready", nil))
	if readyRecorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("readiness status: got %d want %d", readyRecorder.Code, http.StatusServiceUnavailable)
	}
	if got := client.Calls(); got != 0 {
		t.Fatalf("probes fetched config: got %d calls want 0", got)
	}
}

func TestConfigRefresherRecoversReadiness(t *testing.T) {
	client := &refreshTestClient{err: errors.New("console unavailable")}
	provider := console.NewCachingProvider(client, time.Minute)
	stop := startConfigRefresherWithRetry(provider, time.Hour, time.Millisecond)
	defer stop()

	waitFor(t, time.Second, func() bool {
		return client.Calls() > 0
	})

	host := "http://prometheus"
	client.SetConfig(&pb.ObservabilityConfig{PrometheusHost: &host}, nil)
	waitFor(t, time.Second, provider.Ready)

	recorder := httptest.NewRecorder()
	readinessHandler(provider)(recorder, httptest.NewRequest(http.MethodGet, "/ready", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("readiness status after refresh: got %d want %d", recorder.Code, http.StatusOK)
	}
}

func waitFor(t *testing.T, timeout time.Duration, condition func() bool) {
	t.Helper()

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if condition() {
			return
		}
		time.Sleep(time.Millisecond)
	}

	t.Fatal("condition was not met before timeout")
}
