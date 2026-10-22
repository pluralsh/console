package proxy

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"strings"
	"time"
)

const (
	defaultMaxRequestBytes  = 64 << 20
	defaultMaxResponseBytes = 64 << 20
)

// passthroughHeaders are gateway response headers forwarded to clients.
var passthroughHeaders = []string{
	"X-RateLimit-Limit",
	"X-RateLimit-Remaining",
	"X-RateLimit-Reset",
	"Retry-After",
}

type Options struct {
	APIKey  string
	Gateway *Gateway
	Request RequestOptions
	// UpstreamStreaming forwards stream=true requests to invoke-with-response-stream instead of
	// synthesizing the stream from a non-streaming invoke.
	UpstreamStreaming bool
	KeepaliveInterval time.Duration
	Timeout           time.Duration
	Logger            *slog.Logger
	MaxRequestBytes   int64
}

type Handler struct {
	opts Options
	mux  *http.ServeMux
}

func NewHandler(opts Options) *Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	if opts.MaxRequestBytes <= 0 {
		opts.MaxRequestBytes = defaultMaxRequestBytes
	}
	if opts.KeepaliveInterval <= 0 {
		opts.KeepaliveInterval = 10 * time.Second
	}

	h := &Handler{opts: opts, mux: http.NewServeMux()}
	h.mux.HandleFunc("GET /health", h.health)
	h.mux.HandleFunc("GET /healthz", h.health)
	h.mux.Handle("POST /v1/messages", h.authenticated(h.messages))
	h.mux.Handle("POST /v1/messages/count_tokens", h.authenticated(func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, notFound("count_tokens is not supported by the gateway"), nil)
	}))
	h.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, notFound("no route for "+r.Method+" "+r.URL.Path), nil)
	})
	return h
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
	h.mux.ServeHTTP(rec, r)
	if r.URL.Path != "/health" && r.URL.Path != "/healthz" {
		h.opts.Logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	}
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func (h *Handler) authenticated(next http.HandlerFunc) http.Handler {
	expected := []byte(h.opts.APIKey)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := r.Header.Get("x-api-key")
		if key == "" {
			if auth := r.Header.Get("Authorization"); len(auth) > 7 && strings.EqualFold(auth[:7], "bearer ") {
				key = strings.TrimSpace(auth[7:])
			}
		}
		if key == "" || subtle.ConstantTimeCompare([]byte(key), expected) != 1 {
			writeError(w, authenticationError("invalid x-api-key"), nil)
			return
		}
		next(w, r)
	})
}

func (h *Handler) messages(w http.ResponseWriter, r *http.Request) {
	correlationID := firstNonEmpty(r.Header.Get("Client-Correlation-Id"), r.Header.Get("X-Request-Id"), newRequestID())
	w.Header().Set("request-id", correlationID)

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, h.opts.MaxRequestBytes))
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, &APIError{Status: http.StatusRequestEntityTooLarge, Type: "request_too_large", Message: "request body too large"}, nil)
			return
		}
		writeError(w, invalidRequest("failed to read request body"), nil)
		return
	}

	prep, apiErr := PrepareRequest(body, r.Header, h.opts.Request)
	if apiErr != nil {
		writeError(w, apiErr, nil)
		return
	}
	if len(prep.Dropped) > 0 {
		h.opts.Logger.Debug("dropped request fields unsupported by gateway", "fields", prep.Dropped, "request_id", correlationID)
	}

	ctx := r.Context()
	if h.opts.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, h.opts.Timeout)
		defer cancel()
	}

	req := invokeRequest{ModelID: prep.ModelID, Body: prep.Body, CorrelationID: correlationID}
	switch {
	case !prep.Stream:
		res := h.invoke(ctx, req, prep.Model)
		if res.err != nil {
			writeError(w, res.err, res.header)
			return
		}
		copyHeaders(w.Header(), res.header)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(res.msg)
	case h.opts.UpstreamStreaming:
		req.Stream = true
		h.streamUpstream(ctx, w, req, prep.Model)
	default:
		h.streamSynthesized(ctx, w, req, prep.Model)
	}
}

type invokeResult struct {
	msg    *Message
	err    *APIError
	header http.Header
}

// invoke performs a non-streaming gateway call and converts the result.
func (h *Handler) invoke(ctx context.Context, req invokeRequest, model string) invokeResult {
	resp, err := h.opts.Gateway.Invoke(ctx, req)
	if err != nil {
		return invokeResult{err: transportError(ctx, err)}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, defaultMaxResponseBytes))
	if err != nil {
		return invokeResult{err: transportError(ctx, err), header: resp.Header}
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return invokeResult{err: GatewayError(resp.StatusCode, body), header: resp.Header}
	}

	msg, err := ParseGatewayResponse(body, model)
	if err != nil {
		return invokeResult{err: upstreamFailure(err.Error()), header: resp.Header}
	}
	return invokeResult{msg: msg, header: resp.Header}
}

// streamSynthesized serves a streaming request from a non-streaming invoke. The response is held
// back for one keepalive interval so fast failures still get a real HTTP status; after that a 200
// is committed and pings keep the connection alive until the gateway answers.
func (h *Handler) streamSynthesized(ctx context.Context, w http.ResponseWriter, req invokeRequest, model string) {
	results := make(chan invokeResult, 1)
	go func() { results <- h.invoke(ctx, req, model) }()

	ticker := time.NewTicker(h.opts.KeepaliveInterval)
	defer ticker.Stop()

	var sse *sseWriter
	commit := func(header http.Header) {
		copyHeaders(w.Header(), header)
		setSSEHeaders(w.Header())
		w.WriteHeader(http.StatusOK)
		sse = newSSEWriter(w)
	}

	for {
		select {
		case res := <-results:
			if res.err != nil {
				if sse == nil {
					writeError(w, res.err, res.header)
				} else {
					_ = sse.error(res.err)
				}
				return
			}
			if sse == nil {
				commit(res.header)
			}
			for _, ev := range SynthesizeEvents(res.msg) {
				if err := sse.send(ev.name, ev.data); err != nil {
					return
				}
			}
			return
		case <-ticker.C:
			if sse == nil {
				commit(nil)
			}
			if err := sse.ping(); err != nil {
				return
			}
		}
	}
}

func (h *Handler) streamUpstream(ctx context.Context, w http.ResponseWriter, req invokeRequest, model string) {
	resp, err := h.opts.Gateway.Invoke(ctx, req)
	if err != nil {
		writeError(w, transportError(ctx, err), nil)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		writeError(w, GatewayError(resp.StatusCode, body), resp.Header)
		return
	}

	contentType := resp.Header.Get("Content-Type")
	if mediaType, _, _ := mime.ParseMediaType(contentType); mediaType == "application/json" {
		// The gateway answered a streaming request with a complete message; replay it as a stream.
		body, err := io.ReadAll(io.LimitReader(resp.Body, defaultMaxResponseBytes))
		if err != nil {
			writeError(w, transportError(ctx, err), resp.Header)
			return
		}
		msg, err := ParseGatewayResponse(body, model)
		if err != nil {
			writeError(w, upstreamFailure(err.Error()), resp.Header)
			return
		}
		copyHeaders(w.Header(), resp.Header)
		setSSEHeaders(w.Header())
		w.WriteHeader(http.StatusOK)
		sse := newSSEWriter(w)
		for _, ev := range SynthesizeEvents(msg) {
			if sse.send(ev.name, ev.data) != nil {
				return
			}
		}
		return
	}

	copyHeaders(w.Header(), resp.Header)
	setSSEHeaders(w.Header())
	w.WriteHeader(http.StatusOK)
	if err := forwardStream(resp.Body, contentType, model, newSSEWriter(w)); err != nil {
		h.opts.Logger.Debug("client stream write failed", "error", err, "request_id", req.CorrelationID)
	}
}

func transportError(ctx context.Context, err error) *APIError {
	var tokenErr *errTokenUnavailable
	switch {
	case errors.As(err, &tokenErr):
		return upstreamFailure("failed to obtain gateway OAuth token: " + tokenErr.err.Error())
	case errors.Is(ctx.Err(), context.DeadlineExceeded):
		return &APIError{Status: http.StatusGatewayTimeout, Type: "timeout_error", Message: "gateway request timed out"}
	default:
		return upstreamFailure("gateway request failed: " + err.Error())
	}
}

func writeError(w http.ResponseWriter, e *APIError, upstream http.Header) {
	copyHeaders(w.Header(), upstream)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(e.Status)
	_ = json.NewEncoder(w).Encode(e.body())
}

func copyHeaders(dst, src http.Header) {
	for _, key := range passthroughHeaders {
		if v := src.Get(key); v != "" {
			dst.Set(key, v)
		}
	}
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

func newRequestID() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return "req_" + hex.EncodeToString(b)
}

// statusRecorder captures the response status for logging while keeping http.Flusher working.
type statusRecorder struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (r *statusRecorder) WriteHeader(status int) {
	if !r.wroteHeader {
		r.status = status
		r.wroteHeader = true
	}
	r.ResponseWriter.WriteHeader(status)
}

func (r *statusRecorder) Write(b []byte) (int, error) {
	r.wroteHeader = true
	return r.ResponseWriter.Write(b)
}

func (r *statusRecorder) Flush() {
	if f, ok := r.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func (r *statusRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }
