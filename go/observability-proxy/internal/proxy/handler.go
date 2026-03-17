package proxy

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/pluralsh/console/go/observability-proxy/internal/console"
	"github.com/pluralsh/console/go/observability-proxy/internal/logging"
	"k8s.io/klog/v2"
)

// Handler serves observability ingest and query proxy endpoints.
type Handler struct {
	configProvider console.ConfigProvider
	transport      *http.Transport
	recordBytes    func(int64)
}

func NewHandler(provider console.ConfigProvider, upstreamTimeout time.Duration, recordBytes func(int64)) *Handler {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.ResponseHeaderTimeout = upstreamTimeout
	if recordBytes == nil {
		recordBytes = func(int64) {}
	}

	return &Handler{
		configProvider: provider,
		transport:      transport,
		recordBytes:    recordBytes,
	}
}

func (h *Handler) Register(mux *http.ServeMux) {
	klog.V(logging.LevelInfo).Infof("registering observability proxy routes")
	mux.HandleFunc("/ext/v1/ingest/prometheus", h.prometheusIngest)
	mux.HandleFunc("/ext/v1/ingest/elastic", h.elasticIngest)
	mux.HandleFunc("/ext/v1/ingest/elastic/", h.elasticIngest)
	mux.HandleFunc("/ext/v1/query/prometheus", h.prometheusQuery)
	mux.HandleFunc("/ext/v1/query/prometheus/", h.prometheusQuery)
}

func (h *Handler) prometheusIngest(w http.ResponseWriter, r *http.Request) {
	klog.V(logging.LevelVerbose).Infof("handling prometheus ingest request method=%s path=%s", r.Method, r.URL.Path)
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cfg, err := h.configProvider.GetConfig(r.Context())
	if err != nil {
		http.Error(w, "observability config unavailable", http.StatusServiceUnavailable)
		return
	}

	target, err := BuildPrometheusIngestTarget(cfg.PrometheusHost)
	if err != nil {
		klog.Errorf("invalid prometheus ingest target: %v", err)
		http.Error(w, "prometheus ingest target unavailable", http.StatusServiceUnavailable)
		return
	}

	h.forward(w, r, target)
}

func (h *Handler) elasticIngest(w http.ResponseWriter, r *http.Request) {
	klog.V(logging.LevelVerbose).Infof("handling elastic ingest request method=%s path=%s", r.Method, r.URL.Path)
	suffix := strings.TrimPrefix(r.URL.Path, "/ext/v1/ingest/elastic")
	if suffix == "" {
		suffix = "/"
	}

	allowed := map[string]string{
		"GET /":         "/",
		"GET /_license": "/_license",
		"POST /_bulk":   "/_bulk",
	}

	mappedSuffix, ok := allowed[r.Method+" "+suffix]
	if !ok {
		http.NotFound(w, r)
		return
	}

	cfg, err := h.configProvider.GetConfig(r.Context())
	if err != nil {
		http.Error(w, "observability config unavailable", http.StatusServiceUnavailable)
		return
	}

	target, err := BuildElasticTarget(cfg.ElasticHost, mappedSuffix)
	if err != nil {
		klog.Errorf("invalid elastic target: %v", err)
		http.Error(w, "elastic target unavailable", http.StatusServiceUnavailable)
		return
	}

	h.forward(w, r, target)
}

func (h *Handler) prometheusQuery(w http.ResponseWriter, r *http.Request) {
	klog.V(logging.LevelVerbose).Infof("handling prometheus query method=%s path=%s", r.Method, r.URL.Path)

	allowed := map[string]struct{}{
		http.MethodGet:  {},
		http.MethodPost: {},
	}

	if _, ok := allowed[r.Method]; !ok {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cfg, err := h.configProvider.GetConfig(r.Context())
	if err != nil {
		http.Error(w, "observability config unavailable", http.StatusServiceUnavailable)
		return
	}

	target, err := BuildPrometheusQueryTarget(cfg.PrometheusHost, r.URL.Path)
	if err != nil {
		klog.Errorf("invalid prometheus query target: %v", err)
		http.Error(w, "prometheus query target unavailable", http.StatusServiceUnavailable)
		return
	}

	h.forward(w, r, target)
}

func (h *Handler) forward(w http.ResponseWriter, r *http.Request, target *url.URL) {
	klog.V(logging.LevelDebug).Infof(
		"forwarding request method=%s path=%s upstream=%s://%s%s",
		r.Method,
		r.URL.Path,
		target.Scheme,
		target.Host,
		target.Path,
	)
	proxy := &httputil.ReverseProxy{
		Transport: h.transport,
		Rewrite: func(preq *httputil.ProxyRequest) {
			// SetURL joins target path with inbound request path. For this proxy we
			// already compute the full upstream path, so set URL components directly.
			preq.Out.URL.Scheme = target.Scheme
			preq.Out.URL.Host = target.Host
			preq.Out.URL.Path = target.Path
			preq.Out.URL.RawPath = target.RawPath
			preq.Out.Host = target.Host
			preq.SetXForwarded()
			klog.V(logging.LevelTrace).Infof("rewritten request method=%s out_url=%s", preq.Out.Method, preq.Out.URL.String())
		},
		ErrorHandler: func(writer http.ResponseWriter, _ *http.Request, err error) {
			klog.Errorf("proxy upstream error: %v", err)
			status := http.StatusBadGateway
			if errors.Is(err, context.DeadlineExceeded) {
				status = http.StatusGatewayTimeout
			}
			http.Error(writer, "upstream request failed", status)
		},
	}

	if r.ContentLength > 0 {
		h.recordBytes(r.ContentLength)
	} else if r.Body != nil {
		r.Body = &countingReadCloser{
			readCloser: r.Body,
			onRead:     h.recordBytes,
		}
	}

	proxy.ServeHTTP(w, r)
}

type countingReadCloser struct {
	readCloser io.ReadCloser
	onRead     func(int64)
}

func (c *countingReadCloser) Read(p []byte) (int, error) {
	n, err := c.readCloser.Read(p)
	if n > 0 {
		c.onRead(int64(n))
	}
	return n, err
}

func (c *countingReadCloser) Close() error {
	return c.readCloser.Close()
}
