package observability

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/http/pprof"
	"sync"
	"sync/atomic"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"

	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	httpz2 "github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
)

const (
	defaultMaxRequestDuration = 15 * time.Second
	shutdownTimeout           = defaultMaxRequestDuration
	readTimeout               = 1 * time.Second
	writeTimeout              = defaultMaxRequestDuration
	idleTimeout               = 1 * time.Minute
)

// Probe is the expected type for probe functions
type Probe func(context.Context) error

// NoopProbe is a placeholder probe for convenience
func NoopProbe(context.Context) error {
	return nil
}

func NewProbeRegistry() *ProbeRegistry {
	return &ProbeRegistry{
		liveness:  make(map[string]Probe),
		readiness: make(map[string]Probe),
	}
}

type ProbeRegistry struct {
	mu        sync.RWMutex
	liveness  map[string]Probe
	readiness map[string]Probe
}

type toggleValue struct {
	value int32
}

func (t *toggleValue) SetTrue() {
	atomic.StoreInt32(&t.value, 1)
}

func (t *toggleValue) True() bool {
	return atomic.LoadInt32(&t.value) == 1
}

func (p *ProbeRegistry) RegisterLivenessProbe(key string, probe Probe) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.liveness[key] = probe
}

func (p *ProbeRegistry) RegisterReadinessProbe(key string, probe Probe) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.readiness[key] = probe
}

func (p *ProbeRegistry) Liveness(ctx context.Context) error {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return execProbeMap(ctx, p.liveness)
}

func (p *ProbeRegistry) Readiness(ctx context.Context) error {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return execProbeMap(ctx, p.readiness)
}

func (p *ProbeRegistry) RegisterReadinessToggle(key string) func() {
	var value toggleValue
	p.RegisterReadinessProbe(key, func(ctx context.Context) error {
		if value.True() {
			return nil
		}
		return errors.New("not ready yet")
	})
	return value.SetTrue
}

func execProbeMap(ctx context.Context, probes map[string]Probe) error {
	for key, probe := range probes {
		err := probe(ctx)
		if err != nil {
			return fmt.Errorf("%s: %w", key, err)
		}
	}
	return nil
}

type MetricServer struct {
	Log *zap.Logger
	Api modshared.Api
	// Name is the name of the application.
	Name                  string
	Listener              net.Listener
	PrometheusUrlPath     string
	LivenessProbeUrlPath  string
	ReadinessProbeUrlPath string
	Gatherer              prometheus.Gatherer
	Registerer            prometheus.Registerer
	ProbeRegistry         *ProbeRegistry
}

func (s *MetricServer) Run(ctx context.Context) error {
	srv := &http.Server{ // nolint: gosec
		Handler:      s.ConstructHandler(), // nolint: contextcheck
		WriteTimeout: writeTimeout,
		ReadTimeout:  readTimeout,
		IdleTimeout:  idleTimeout,
	}
	return httpz2.RunServer(ctx, srv, s.Listener, 0, shutdownTimeout)
}

func (s *MetricServer) ConstructHandler() http.Handler {
	mux := http.NewServeMux()
	s.probesHandler(mux) // nolint: contextcheck
	s.pprofHandler(mux)
	s.prometheusHandler(mux)
	return mux
}

func (s *MetricServer) setHeader(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header()[httpz2.ServerHeader] = []string{s.Name}
		next.ServeHTTP(w, r)
	})
}

func (s *MetricServer) probesHandler(mux *http.ServeMux) {
	mux.Handle(
		s.LivenessProbeUrlPath,
		s.setHeader(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
			err := s.ProbeRegistry.Liveness(request.Context())
			if err != nil {
				s.logAndCapture(request.Context(), "LivenessProbe failed", err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)
		})),
	)
	mux.Handle(
		s.ReadinessProbeUrlPath,
		s.setHeader(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
			err := s.ProbeRegistry.Readiness(request.Context())
			if err != nil {
				s.logAndCapture(request.Context(), "ReadinessProbe failed", err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)
		})),
	)
}

func (s *MetricServer) prometheusHandler(mux *http.ServeMux) {
	mux.Handle(
		s.PrometheusUrlPath,
		s.setHeader(promhttp.InstrumentMetricHandler(s.Registerer, promhttp.HandlerFor(s.Gatherer, promhttp.HandlerOpts{
			Timeout: defaultMaxRequestDuration,
		}))),
	)
}

func (s *MetricServer) pprofHandler(mux *http.ServeMux) {
	routes := map[string]func(http.ResponseWriter, *http.Request){
		"/debug/pprof/":        pprof.Index,
		"/debug/pprof/cmdline": pprof.Cmdline,
		"/debug/pprof/profile": pprof.Profile,
		"/debug/pprof/symbol":  pprof.Symbol,
		"/debug/pprof/trace":   pprof.Trace,
	}
	for route, handler := range routes {
		mux.Handle(route, s.setHeader(http.HandlerFunc(handler)))
	}
}

func (s *MetricServer) logAndCapture(ctx context.Context, msg string, err error) {
	s.Api.HandleProcessingError(ctx, s.Log, modshared.NoAgentId, msg, err)
}
