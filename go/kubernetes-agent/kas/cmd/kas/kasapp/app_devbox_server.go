package kasapp

import (
	"context"
	"crypto/tls"
	"errors"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/ash2k/stager"
	"github.com/coder/websocket"
	grpc_validator "github.com/grpc-ecosystem/go-grpc-middleware/v2/interceptors/validator"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/redis/rueidis"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	otelmetric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/stats"

	devboxv1 "github.com/pluralsh/console/go/kubernetes-agent/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/kascfg"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/devbox"
	modserver2 "github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/observability"
	tunnel2 "github.com/pluralsh/console/go/kubernetes-agent/pkg/module/reverse_tunnel/tunnel"
	grpctool2 "github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/httpz"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/metric"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/redistool"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/retry"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/tlstool"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/wstunnel"
)

const (
	devboxConnectionRateExceededMetricName = "devbox_server_rate_exceeded_total"
	devboxRoutingDurationMetricName        = "devbox_routing_duration_seconds"
	devboxRoutingTimeoutMetricName         = "devbox_routing_timeout_total"
	devboxReadHeaderTimeout                = 10 * time.Second
)

// devboxServer is the devbox listener: devbox-gateways connect to it with gRPC over WebSocket (authenticated
// with their cluster's deploy token, like agentk) and register reverse tunnels, and browsers open stream
// WebSockets on <url_path_prefix>/streams/<stream_id>. Gateway tunnels live in their own registry so that
// Control calls are only ever routed to gateways.
type devboxServer struct {
	log            *zap.Logger
	cfg            *kascfg.DevboxCF
	tlsConfig      *tls.Config
	server         *grpc.Server
	tunnelRegistry *tunnel2.Registry
	tunnelQuerier  *tunnel2.AggregatingQuerier
	router         *router
	streamsHandler http.Handler
	auxCancel      context.CancelFunc
	ready          func()
}

func newDevboxServer(log *zap.Logger, cfg *kascfg.ConfigurationFile, srvApi modserver2.Api, dt trace.Tracer, dm otelmetric.Meter,
	tp trace.TracerProvider, mp otelmetric.MeterProvider, redisClient rueidis.Client, ssh stats.Handler,
	factory modserver2.AgentRpcApiFactory, probeRegistry *observability.ProbeRegistry, reg prometheus.Registerer,
	streamProm grpc.StreamServerInterceptor, unaryProm grpc.UnaryServerInterceptor,
	grpcServerErrorReporter grpctool2.ServerErrorReporter,
	kasPool grpctool2.PoolInterface, ownPrivateApiUrl string, internalServer, privateApiServer grpc.ServiceRegistrar,
	pollConfig retry.PollConfigFactory) (*devboxServer, error) {
	dCfg := cfg.Devbox
	listenCfg := dCfg.Listen
	tlsConfig, err := tlstool.MaybeDefaultServerTLSConfig(listenCfg.CertificateFile, listenCfg.KeyFile)
	if err != nil {
		return nil, err
	}
	tunnelRegistry, err := tunnel2.NewRegistry(
		log,
		srvApi,
		dt,
		dCfg.RedisConnInfoRefresh.AsDuration(),
		dCfg.RedisConnInfoTtl.AsDuration(),
		tunnel2.NewRedisTracker(redisClient, cfg.Redis.KeyPrefix+":devbox_tunnel_tracker", ownPrivateApiUrl),
	)
	if err != nil {
		return nil, err
	}
	tunnelQuerier := tunnel2.NewAggregatingQuerier(log, tunnelRegistry, srvApi, pollConfig, routingCachePeriod)
	gatewayRouter, err := newRouterWithOptions(kasPool, tunnelQuerier, tunnelRegistry, ownPrivateApiUrl,
		internalServer, privateApiServer, pollConfig, tp, reg, routerOptions{
			routingDurationMetricName: devboxRoutingDurationMetricName,
			routingTimeoutMetricName:  devboxRoutingTimeoutMetricName,
			tunnelFindTimeout:         dCfg.RoutingTimeout.AsDuration(),
			tunnelNotFoundErr:         devbox.ClusterOfflineError,
			sanitizeTunnelMeta:        devbox.StripCredentials,
		})
	if err != nil {
		return nil, err
	}
	gatewayRouter.RegisterAgentApi(&devboxv1.Gateway_ServiceDesc)

	streamInterceptors := []grpc.StreamServerInterceptor{
		streamProm, // 1. measure all invocations
		modserver2.StreamAgentRpcApiInterceptor(factory), // 2. inject RPC API
		grpc_validator.StreamServerInterceptor(),         // x. wrap with validator
	}
	unaryInterceptors := []grpc.UnaryServerInterceptor{
		unaryProm, // 1. measure all invocations
		modserver2.UnaryAgentRpcApiInterceptor(factory), // 2. inject RPC API
		grpc_validator.UnaryServerInterceptor(),         // x. wrap with validator
	}
	if limit := listenCfg.ConnectionsPerTokenPerMinute; limit > 0 {
		limiter, err := newDevboxConnectionLimiter(cfg, redisClient, reg, dt, dm, limit) // nolint:govet
		if err != nil {
			return nil, err
		}
		streamInterceptors = append(streamInterceptors, grpctool2.StreamServerLimitingInterceptor(limiter))
		unaryInterceptors = append(unaryInterceptors, grpctool2.UnaryServerLimitingInterceptor(limiter))
	}
	streamInterceptors = append(streamInterceptors, grpctool2.StreamServerErrorReporterInterceptor(grpcServerErrorReporter))
	unaryInterceptors = append(unaryInterceptors, grpctool2.UnaryServerErrorReporterInterceptor(grpcServerErrorReporter))

	auxCtx, auxCancel := context.WithCancel(context.Background())
	traceContextProp := propagation.TraceContext{} // only want trace id, not baggage from external clients
	keepaliveOpt, sh := grpctool2.MaxConnectionAge2GrpcKeepalive(auxCtx, listenCfg.MaxConnectionAge.AsDuration())
	maxMsgSize := int(listenCfg.MaxMessageSize)
	server := grpc.NewServer(
		grpc.StatsHandler(otelgrpc.NewServerHandler(
			otelgrpc.WithTracerProvider(tp),
			otelgrpc.WithMeterProvider(mp),
			otelgrpc.WithPropagators(traceContextProp),
			otelgrpc.WithMessageEvents(otelgrpc.ReceivedEvents, otelgrpc.SentEvents),
		)),
		grpc.StatsHandler(ssh),
		grpc.StatsHandler(sh),
		grpc.ChainStreamInterceptor(streamInterceptors...),
		grpc.ChainUnaryInterceptor(unaryInterceptors...),
		grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
			MinTime:             20 * time.Second,
			PermitWithoutStream: true,
		}),
		keepaliveOpt,
		// Ingest is forwarded to console as raw frames; tunnel frames still use protobuf.
		grpc.ForceServerCodec(grpctool2.RawCodecWithProtoFallback{}),
		grpc.MaxRecvMsgSize(maxMsgSize),
		grpc.MaxSendMsgSize(maxMsgSize),
	)
	return &devboxServer{
		log:            log,
		cfg:            dCfg,
		tlsConfig:      tlsConfig,
		server:         server,
		tunnelRegistry: tunnelRegistry,
		tunnelQuerier:  tunnelQuerier,
		router:         gatewayRouter,
		auxCancel:      auxCancel,
		ready:          probeRegistry.RegisterReadinessToggle("devboxServer"),
	}, nil
}

func newDevboxConnectionLimiter(cfg *kascfg.ConfigurationFile, redisClient rueidis.Client, reg prometheus.Registerer,
	dt trace.Tracer, dm otelmetric.Meter, limit uint32) (grpctool2.ServerLimiter, error) {
	rateExceededCounter := prometheus.NewCounter(prometheus.CounterOpts{
		Name: devboxConnectionRateExceededMetricName,
		Help: "The total number of times the configured rate limit of devbox gateway calls was exceeded",
	})
	if err := metric.Register(reg, rateExceededCounter); err != nil {
		return nil, err
	}
	limiter := redistool.NewTokenLimiter(
		redisClient,
		cfg.Redis.KeyPrefix+":devbox_limit",
		uint64(limit),
		rateExceededCounter,
		func(ctx context.Context) redistool.RpcApi {
			return &tokenLimiterApi{
				rpcApi: modserver2.AgentRpcApiFromContext(ctx),
			}
		},
	)
	return metric.NewAllowLimiterInstrumentation("devbox_connection", float64(limit), "{call/token/m}", dt, dm, limiter)
}

func (s *devboxServer) setStreamsHandler(h http.Handler) {
	s.streamsHandler = h
}

func (s *devboxServer) Start(stage stager.Stage) {
	stage.Go(s.tunnelQuerier.Run)
	registryCtx, registryCancel := context.WithCancel(context.Background())
	stage.Go(func(ctx context.Context) error {
		return s.tunnelRegistry.Run(registryCtx) // use a separate ctx to stop when the server starts stopping
	})
	wsCtx, wsCancel := context.WithCancel(context.Background())
	lis := newChanListener()
	var httpServer *http.Server
	grpctool2.StartServer(stage, s.server, func() (retLis net.Listener, retErr error) {
		defer func() {
			if retErr != nil {
				registryCancel()
				wsCancel()
			}
		}()
		var tcpLis net.Listener
		var err error
		if s.tlsConfig != nil {
			s.tlsConfig.NextProtos = []string{httpz.TLSNextProtoH1} // WebSocket only
			tcpLis, err = tls.Listen(*s.cfg.Listen.Network, s.cfg.Listen.Address, s.tlsConfig)
		} else {
			tcpLis, err = net.Listen(*s.cfg.Listen.Network, s.cfg.Listen.Address)
		}
		if err != nil {
			return nil, err
		}
		lis.addr = tcpLis.Addr()
		httpServer = &http.Server{
			Handler:           s.httpHandler(wsCtx, lis.conns),
			ReadHeaderTimeout: devboxReadHeaderTimeout,
		}
		go func() {
			err := httpServer.Serve(tcpLis) // nolint:govet
			if err != nil && !errors.Is(err, http.ErrServerClosed) {
				s.log.Error("Devbox HTTP server failed", logz.Error(err))
			}
		}()
		s.log.Info("Devbox endpoint is up",
			logz.NetNetworkFromAddr(lis.addr),
			logz.NetAddressFromAddr(lis.addr),
			logz.UrlPathPrefix(s.cfg.UrlPathPrefix),
			zap.Bool("streams_enabled", s.streamsHandler != nil),
		)
		s.ready()
		return lis, nil
	}, func() {
		time.Sleep(s.cfg.Listen.ListenGracePeriod.AsDuration())
		if httpServer != nil {
			// Stop accepting; hijacked connections (tunnels, streams) are not tracked by Shutdown and are ended
			// by the gRPC server stopping and the routing context being canceled.
			_ = httpServer.Close()
		}
		wsCancel()
		s.auxCancel()
		registryCancel()
	})
}

func (s *devboxServer) httpHandler(wsCtx context.Context, sink chan<- net.Conn) http.Handler {
	tunnelHandler := &wstunnel.HttpHandler{
		Ctx:        wsCtx,
		ServerName: kasServerName(),
		AcceptOptions: websocket.AcceptOptions{
			CompressionMode: websocket.CompressionDisabled,
			Subprotocols:    []string{wstunnel.TunnelWebSocketProtocol},
		},
		Sink:      sink,
		ReadLimit: int64(s.cfg.Listen.MaxMessageSize),
	}
	if s.streamsHandler == nil {
		return tunnelHandler
	}
	mux := http.NewServeMux()
	mux.Handle(s.cfg.UrlPathPrefix+devbox.StreamsPathSegment, s.streamsHandler)
	mux.Handle(devbox.StreamsPathSegment, s.streamsHandler) // url_path_prefix stripped by an ingress
	mux.Handle("/", tunnelHandler)
	return mux
}

// chanListener is a net.Listener for connections produced elsewhere, here by the WebSocket handler.
type chanListener struct {
	conns     chan net.Conn
	done      chan struct{}
	closeOnce sync.Once
	addr      net.Addr
}

func newChanListener() *chanListener {
	return &chanListener{
		conns: make(chan net.Conn),
		done:  make(chan struct{}),
	}
}

func (l *chanListener) Accept() (net.Conn, error) {
	select {
	case c := <-l.conns:
		return c, nil
	case <-l.done:
		return nil, net.ErrClosed
	}
}

func (l *chanListener) Close() error {
	l.closeOnce.Do(func() { close(l.done) })
	return nil
}

func (l *chanListener) Addr() net.Addr {
	return l.addr
}
