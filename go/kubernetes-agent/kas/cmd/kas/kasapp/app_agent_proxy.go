package kasapp

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/ash2k/stager"
	"github.com/coder/websocket"
	"go.uber.org/zap"

	"github.com/pluralsh/kubernetes-agent/pkg/kascfg"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/wstunnel"
)

const (
	// proxyDefaultMaxMessageSize mirrors defaultMaxMessageSize from app_agent_server.go
	proxyDefaultMaxMessageSize = 10 * 1024 * 1024

	// proxyDefaultHandshakeTimeout is a reasonable upper bound for WS handshakes.
	proxyDefaultHandshakeTimeout = 30 * time.Second

	// proxyDefaultListenAddress is used when no explicit listen address is
	// provided for the proxy. It matches the style of other listeners and uses
	// port 8180 by default as requested.
	proxyDefaultListenAddress = ":8180"
)

// agentProxyListenConfig is a local helper struct describing how the proxy
// HTTP server should listen. It is intentionally minimal and derived from the
// main configuration file, so no additional proto fields are required.
//
// If Agent.ListenKubernetesApi is configured we can reuse its network setting;
// otherwise we default to TCP on port 8180.
// (We don't add new config fields here to keep the change scoped to this file.)

type agentProxyListenConfig struct {
	network string
	address string
}

func deriveAgentProxyListenConfig(cfg *kascfg.ConfigurationFile) agentProxyListenConfig {
	// Default values
	lc := agentProxyListenConfig{
		network: "tcp",
		address: proxyDefaultListenAddress,
	}

	// If Kubernetes API listen is configured, prefer its network setting so we
	// behave similarly from an operational perspective.
	if cfg != nil && cfg.Agent != nil && cfg.Agent.KubernetesApi != nil && cfg.Agent.KubernetesApi.Listen != nil {
		if cfg.Agent.KubernetesApi.Listen.Network != nil && *cfg.Agent.KubernetesApi.Listen.Network != "" {
			lc.network = *cfg.Agent.KubernetesApi.Listen.Network
		}
	}

	return lc
}

// startAgentWebsocketProxyServer starts an HTTP server exposing the
// WebSocket proxy on its own listener. The listen parameters are derived from
// the main configuration but default to TCP on :8180 when not specified. This
// mirrors the configurability of the agent server while keeping all logic
// within this file.
func startAgentWebsocketProxyServer(stage stager.Stage, log *zap.Logger, cfg *kascfg.ConfigurationFile) error {
	listenCfg := deriveAgentProxyListenConfig(cfg)

	proxyHandler, err := newAgentWebsocketProxyHandler(log, cfg)
	if err != nil {
		return fmt.Errorf("agent proxy handler: %w", err)
	}

	mux := http.NewServeMux()

	// Lightweight health endpoint similar to the API module.
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// All other paths are served by the websocket proxy handler.
	mux.Handle("/", proxyHandler)

	server := &http.Server{
		Handler: mux,
	}

	stage.Go(func(ctx context.Context) error {
		// Prepare listener explicitly so we can log the bound address.
		lis, err := net.Listen(listenCfg.network, listenCfg.address)
		if err != nil {
			return err
		}
		addr := lis.Addr()
		log.Info("Agent WebSocket proxy listen endpoint is up",
			zap.String("network", addr.Network()),
			zap.String("address", addr.String()),
		)

		// Run the HTTP server until context is done.
		go func() {
			<-ctx.Done()
			_ = server.Shutdown(context.Background())
		}()

		if err := server.Serve(lis); !errors.Is(err, http.ErrServerClosed) && err != nil {
			return err
		}
		return nil
	})

	return nil
}

// NewAgentWebsocketProxyHandler returns an http.Handler that accepts incoming
// WebSocket connections (e.g. via Kubernetes Ingress) and proxies them to the
// internal agent gRPC-over-WebSocket listener started by newAgentServer.
//
// The proxy is intentionally dumb: it does not implement any authentication or
// authorization. All security decisions are delegated to the upstream agent
// server. The handler simply upgrades, dials the upstream and pipes frames
// bidirectionally until either side closes.
//
// The upstream address is derived from cfg.Agent.Listen. It assumes that the
// agent server is configured with listen.websocket = true and listens on the
// same host/port that this proxy can reach. The scheme (ws or wss) for
// upstream connections is determined by whether TLS is requested for the
// upstream hop.
func newAgentWebsocketProxyHandler(log *zap.Logger, cfg *kascfg.ConfigurationFile) (http.Handler, error) {
	if cfg == nil || cfg.Agent == nil || cfg.Agent.Listen == nil {
		return nil, errors.New("agent listen configuration is required for proxy")
	}

	upstreamURL, tlsConfig, err := buildAgentUpstreamURL(cfg)
	if err != nil {
		return nil, err
	}

	// HTTP transport used for dialing upstream WebSocket over HTTP(S).
	transport := &http.Transport{
		Proxy:               http.ProxyFromEnvironment,
		DialContext:         (&net.Dialer{Timeout: 30 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
		TLSClientConfig:     tlsConfig,
		MaxIdleConns:        10,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
		ForceAttemptHTTP2:   true,
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Basic request tracing for debugging.
		logFields := []zap.Field{
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.String("remote_addr", r.RemoteAddr),
			zap.String("host", r.Host),
		}
		log.Debug("agent proxy: incoming request", logFields...)

		// Only WebSocket upgrade requests are supported here.
		if !headerIsWebSocketUpgrade(r.Header) {
			log.Debug("agent proxy: non-websocket request rejected", append(logFields, zap.Any("headers", r.Header))...)
			http.Error(w, "websocket upgrade required", http.StatusBadRequest)
			return
		}

		ctx := r.Context()
		ctx, cancel := context.WithCancel(ctx)
		defer cancel()

		clientConn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
			CompressionMode: websocket.CompressionDisabled,
		})
		if err != nil {
			log.Warn("agent proxy: websocket accept failed", append(logFields, zap.Error(err))...)
			return
		}
		defer func() {
			_ = clientConn.Close(websocket.StatusInternalError, "proxy shutting down")
		}()
		clientConn.SetReadLimit(proxyDefaultMaxMessageSize)

		u := *upstreamURL // shallow copy
		u.Path = r.URL.Path
		u.RawQuery = r.URL.RawQuery
		log.Debug("agent proxy: dialing upstream", append(logFields, zap.String("upstream_url", u.String()))...)

		dialCtx, dialCancel := context.WithTimeout(ctx, proxyDefaultHandshakeTimeout)
		defer dialCancel()

		requestHeader := http.Header{}
		for k, vs := range r.Header {
			for _, v := range vs {
				requestHeader.Add(k, v)
			}
		}

		// Use wstunnel.Dial so the correct Sec-WebSocket-Protocol is negotiated
		// with the agent server (TunnelWebSocketProtocol = "ws-tunnel").
		upstreamConn, _, err := wstunnel.Dial(dialCtx, u.String(), &websocket.DialOptions{
			HTTPHeader: requestHeader,
			HTTPClient: &http.Client{Transport: transport},
		})
		if err != nil {
			log.Warn("agent proxy: upstream websocket dial failed", zap.String("upstream", u.String()), zap.Error(err))
			_ = clientConn.Close(websocket.StatusTryAgainLater, "upstream unavailable")
			return
		}
		defer func() {
			_ = upstreamConn.Close(websocket.StatusInternalError, "proxy shutting down")
		}()
		upstreamConn.SetReadLimit(proxyDefaultMaxMessageSize)

		defer func() {
			_ = clientConn.Close(websocket.StatusNormalClosure, "")
			_ = upstreamConn.Close(websocket.StatusNormalClosure, "")
		}()

		errc := make(chan error, 2)
		go proxyCopy(ctx, log, clientConn, upstreamConn, "client->upstream", errc)
		go proxyCopy(ctx, log, upstreamConn, clientConn, "upstream->client", errc)

		// Wait for either copy direction to fail or context cancellation.
		select {
		case <-ctx.Done():
			log.Debug("agent proxy: context cancelled", zap.Error(ctx.Err()))
		case err = <-errc:
			if err != nil && !errors.Is(err, context.Canceled) {
				log.Debug("agent proxy: stream finished", zap.Error(err))
			}
		}
	}), nil
}

// headerIsWebSocketUpgrade checks whether the given headers represent a
// WebSocket upgrade request.
func headerIsWebSocketUpgrade(h http.Header) bool {
	if !headerValueContainsToken(h.Get("Connection"), "upgrade") {
		return false
	}
	if strings.ToLower(h.Get("Upgrade")) != "websocket" {
		return false
	}
	return true
}

// headerValueContainsToken reports whether a comma-separated header value
// (such as Connection) contains a given token, case-insensitively.
func headerValueContainsToken(v, token string) bool {
	for _, part := range strings.Split(v, ",") {
		if strings.EqualFold(strings.TrimSpace(part), token) {
			return true
		}
	}
	return false
}

// buildAgentUpstreamURL constructs the base URL used for dialing the upstream
// agent WebSocket listener from the proxy.
//
// It interprets cfg.Agent.Listen as the address where the agent server listens
// for gRPC-over-WebSocket connections, and chooses ws or wss scheme depending
// on whether TLS is used for the upstream hop. For simplicity, we assume that
// the proxy can resolve and reach the same address as external clients see via
// Ingress (e.g. when running side-by-side in the same cluster or behind an
// internal Service).
func buildAgentUpstreamURL(cfg *kascfg.ConfigurationFile) (*url.URL, *tls.Config, error) {
	listen := cfg.Agent.Listen
	if listen == nil {
		return nil, nil, errors.New("agent listen configuration is nil")
	}

	// Determine scheme: upstream hop may or may not need TLS. At this stage we
	// don't have a dedicated client TLS config for upstream, so we only switch
	// to wss if certificate/key are provided. The tls.Config returned from here
	// is intended only for this upstream hop.
	var tlsCfg *tls.Config
	var scheme string
	if listen.CertificateFile != "" && listen.KeyFile != "" {
		// Use default client TLS config; in many deployments, the agent server
		// is exposed via a Service with a standard certificate which can be
		// validated using system CAs.
		// We intentionally don't try to reuse server-side TLS config because it
		// may include settings specific to inbound listeners.
		tlsCfg = &tls.Config{}
		scheme = "wss"
	} else {
		scheme = "ws"
	}

	addr := listen.Address
	if addr == "" {
		return nil, nil, errors.New("agent listen address is empty")
	}

	u := &url.URL{
		Scheme: scheme,
		Host:   addr,
	}
	return u, tlsCfg, nil
}

// proxyCopy forwards messages from src to dst until an error occurs or the
// context is done. It treats the payload as opaque and forwards message type
// and payload as-is, which is suitable for gRPC-over-WebSocket usage.
func proxyCopy(ctx context.Context, log *zap.Logger, src, dst *websocket.Conn, direction string, errc chan<- error) {
	for {
		select {
		case <-ctx.Done():
			errc <- ctx.Err()
			return
		default:
			// Continue
		}

		msgType, data, err := src.Read(ctx)
		if err != nil {
			// Normal WebSocket close is not an error for logging purposes.
			var closeErr *websocket.CloseError
			if errors.As(err, &closeErr) && closeErr.Code == websocket.StatusNormalClosure {
				log.Debug("agent proxy: normal websocket closure", zap.String("direction", direction))
				errc <- nil
				return
			}
			// Any other error terminates the direction.
			log.Debug("agent proxy: read failed", zap.String("direction", direction), zap.Error(err))
			errc <- err
			return
		}

		if err = dst.Write(ctx, msgType, data); err != nil {
			log.Debug("agent proxy: write failed", zap.String("direction", direction), zap.Error(err))
			errc <- err
			return
		}
	}
}
