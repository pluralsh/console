package kasapp

import (
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/ash2k/stager"
	"github.com/getsentry/sentry-go"
	grpc_prometheus "github.com/grpc-ecosystem/go-grpc-middleware/providers/prometheus"
	"go.opentelemetry.io/otel/trace/noop"

	usage_metrics_server "github.com/pluralsh/kubernetes-agent/pkg/module/usage_metrics/server"

	"github.com/pluralsh/kubernetes-agent/cmd/kas/kasapp/plural"
	"github.com/pluralsh/kubernetes-agent/pkg/api"
	gapi "github.com/pluralsh/kubernetes-agent/pkg/gitlab/api"
	agent_registrar_server "github.com/pluralsh/kubernetes-agent/pkg/module/agent_registrar/server"
	"github.com/pluralsh/kubernetes-agent/pkg/module/agent_tracker"
	agent_tracker_server "github.com/pluralsh/kubernetes-agent/pkg/module/agent_tracker/server"
	kubernetes_api_server "github.com/pluralsh/kubernetes-agent/pkg/module/kubernetes_api/server"
	modserver2 "github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/module/observability"
	observability_server "github.com/pluralsh/kubernetes-agent/pkg/module/observability/server"
	reverse_tunnel_server "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/server"
	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/tunnel"
	"github.com/pluralsh/kubernetes-agent/pkg/module/usage_metrics"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/cache"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/errz"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/metric"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
	redistool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/redistool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/retry"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/tlstool"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/redis/rueidis"
	"github.com/redis/rueidis/rueidisotel"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	promexp "go.opentelemetry.io/otel/exporters/prometheus"
	otelmetric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	metricsdk "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	tracesdk "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.37.0"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	_ "google.golang.org/grpc/encoding/gzip" // Install the gzip compressor

	"github.com/pluralsh/kubernetes-agent/cmd"
	"github.com/pluralsh/kubernetes-agent/pkg/kascfg"
)

const (
	routingAttemptInterval   = 50 * time.Millisecond
	routingInitBackoff       = 100 * time.Millisecond
	routingMaxBackoff        = 1 * time.Second
	routingResetDuration     = 10 * time.Second
	routingBackoffFactor     = 2.0
	routingJitter            = 1.0
	routingTunnelFindTimeout = 20 * time.Second
	routingCachePeriod       = 5 * time.Minute
	routingTryNewKasInterval = 10 * time.Millisecond

	kasName = "gitlab-kas"

	kasTracerName = "kas"
	kasMeterName  = "kas"

	gitlabBuildInfoGaugeMetricName               = "gitlab_build_info"
	kasVersionAttr                 attribute.Key = "version"
	kasBuiltAttr                   attribute.Key = "built"
)

type ConfiguredApp struct {
	Log           *zap.Logger
	Configuration *kascfg.ConfigurationFile
}

func (a *ConfiguredApp) Run(ctx context.Context) (retErr error) {
	// Metrics
	reg := prometheus.NewPedanticRegistry()
	ssh := grpctool2.NewServerRequestsInFlightStatsHandler()
	csh := grpctool2.NewClientRequestsInFlightStatsHandler()
	goCollector := collectors.NewGoCollector()
	procCollector := collectors.NewProcessCollector(collectors.ProcessCollectorOpts{})
	srvProm := grpc_prometheus.NewServerMetrics()
	clientProm := grpc_prometheus.NewClientMetrics()
	err := metric.Register(reg, ssh, csh, goCollector, procCollector, srvProm, clientProm)
	if err != nil {
		return err
	}
	streamProm := srvProm.StreamServerInterceptor()
	unaryProm := srvProm.UnaryServerInterceptor()
	streamClientProm := clientProm.StreamClientInterceptor()
	unaryClientProm := clientProm.UnaryClientInterceptor()

	// Probe Registry
	probeRegistry := observability.NewProbeRegistry()

	// OTEL resource
	r, err := constructOTELResource()
	if err != nil {
		return err
	}

	// OTEL metrics
	mp, mpStop, err := a.constructOTELMeterProvider(r, reg) // nolint: contextcheck
	if err != nil {
		return err
	}
	defer errz.SafeCall(mpStop, &retErr)
	dm := mp.Meter(kasMeterName)
	err = gitlabBuildInfoGauge(dm)
	if err != nil {
		return err
	}

	// OTEL Tracing
	tp, p, tpStop, err := a.constructOTELTracingTools(ctx, r)
	if err != nil {
		return err
	}
	defer errz.SafeCall(tpStop, &retErr)
	dt := tp.Tracer(kasTracerName) // defaultTracer

	// Sentry
	sentryHub, err := a.constructSentryHub(tp, mp, p)
	if err != nil {
		return fmt.Errorf("error tracker: %w", err)
	}

	// Redis
	redisClient, err := a.constructRedisClient(tp, mp)
	if err != nil {
		return err
	}
	defer redisClient.Close()
	probeRegistry.RegisterReadinessProbe("redis", constructRedisReadinessProbe(redisClient))

	srvApi := newServerApi(a.Log, sentryHub, redisClient)
	errRep := modshared.ApiToErrReporter(srvApi)
	grpcServerErrorReporter := &serverErrorReporter{log: a.Log, errReporter: errRep}

	// RPC API factory
	// Plural: Use fake factory
	rpcApiFactory, agentRpcApiFactory := a.constructPluralRpcApiFactory(errRep, sentryHub, redisClient, dt)

	// Server for handling API requests from other kas instances
	privateApiSrv, err := newPrivateApiServer(a.Log, errRep, a.Configuration, tp, mp, p, csh, ssh, rpcApiFactory, // nolint: contextcheck
		probeRegistry, streamProm, unaryProm, streamClientProm, unaryClientProm, grpcServerErrorReporter)
	if err != nil {
		return fmt.Errorf("private API server: %w", err)
	}

	// Server for handling agentk requests
	agentSrv, err := newAgentServer(a.Log, a.Configuration, srvApi, dt, dm, tp, mp, redisClient, ssh, agentRpcApiFactory, // nolint: contextcheck
		privateApiSrv.ownUrl, probeRegistry, reg, streamProm, unaryProm, grpcServerErrorReporter)
	if err != nil {
		return fmt.Errorf("agent server: %w", err)
	}

	// Server for handling external requests e.g. from Plural
	apiSrv, err := newApiServer(a.Log, a.Configuration, tp, mp, p, ssh, rpcApiFactory, probeRegistry, // nolint: contextcheck
		streamProm, unaryProm, grpcServerErrorReporter)
	if err != nil {
		return fmt.Errorf("API server: %w", err)
	}

	// Construct internal gRPC server
	internalSrv, err := newInternalServer(tp, mp, p, rpcApiFactory, probeRegistry, grpcServerErrorReporter) // nolint: contextcheck
	if err != nil {
		return err
	}
	defer errz.SafeClose(internalSrv.inMemConn, &retErr)

	// Kas to agentk router
	pollConfig := retry.NewPollConfigFactory(routingAttemptInterval, retry.NewExponentialBackoffFactory(
		routingInitBackoff,
		routingMaxBackoff,
		routingResetDuration,
		routingBackoffFactor,
		routingJitter,
	))
	tunnelQuerier := tunnel.NewAggregatingQuerier(a.Log, agentSrv.tunnelRegistry, srvApi, pollConfig, routingCachePeriod)
	kasToAgentRouter, err := newRouter(
		privateApiSrv.kasPool,
		tunnelQuerier,
		agentSrv.tunnelRegistry,
		privateApiSrv.ownUrl,
		internalSrv.server,
		privateApiSrv,
		pollConfig,
		tp,
		reg)
	if err != nil {
		return err
	}

	// Agent tracker
	agentTracker := a.constructAgentTracker(errRep, redisClient)

	// Usage tracker
	usageTracker := usage_metrics.NewUsageTracker()

	// Module factories
	factories := []modserver2.Factory{
		&observability_server.Factory{
			Gatherer: reg,
		},
		&usage_metrics_server.Factory{
			UsageTracker: usageTracker,
		},
		&agent_registrar_server.Factory{
			AgentRegisterer: agentTracker,
		},
		&agent_tracker_server.Factory{
			AgentQuerier: agentTracker,
		},
		&reverse_tunnel_server.Factory{
			TunnelHandler: agentSrv.tunnelRegistry,
		},
		&kubernetes_api_server.Factory{},
	}

	var beforeServersModules, afterServersModules []modserver2.Module
	for _, factory := range factories {
		// factory.New() must be called from the main goroutine because it may mutate a gRPC server (register an API)
		// and that can only be done before Serve() is called on the server.
		moduleName := factory.Name()
		module, err := factory.New(&modserver2.Config{
			Log:              a.Log.With(logz.ModuleName(moduleName)),
			Api:              srvApi,
			Config:           a.Configuration,
			Registerer:       reg,
			UsageTracker:     usageTracker,
			AgentServer:      agentSrv.server,
			ApiServer:        apiSrv.server,
			RegisterAgentApi: kasToAgentRouter.RegisterAgentApi,
			AgentConn:        internalSrv.inMemConn,
			TraceProvider:    tp,
			TracePropagator:  p,
			MeterProvider:    mp,
			RedisClient:      redisClient,
			KasName:          kasName,
			Version:          cmd.Version,
			CommitId:         cmd.Commit,
			ProbeRegistry:    probeRegistry,
		})
		if err != nil {
			return fmt.Errorf("%s: %w", moduleName, err)
		}
		phase := factory.StartStopPhase()
		switch phase {
		case modshared.ModuleStartBeforeServers:
			beforeServersModules = append(beforeServersModules, module)
		case modshared.ModuleStartAfterServers:
			afterServersModules = append(afterServersModules, module)
		default:
			return fmt.Errorf("invalid StartStopPhase from factory %s: %d", moduleName, phase)
		}
	}

	// Start things up. Stages are shut down in reverse order.
	return stager.RunStages(ctx,
		// Start things that modules use.
		func(stage stager.Stage) {
			stage.Go(agentTracker.Run)
			stage.Go(tunnelQuerier.Run)
		},
		// Start modules.
		func(stage stager.Stage) {
			startModules(stage, beforeServersModules)
		},
		// Start internal gRPC server. This one must be shut down after all other servers have stopped to ensure
		// it's impossible for them to make a request to the internal server and get a failure because
		// it has stopped already.
		func(stage stager.Stage) {
			internalSrv.Start(stage)
		},
		// Start other gRPC servers.
		func(stage stager.Stage) {
			agentSrv.Start(stage)
			err = startAgentWebsocketProxyServer(stage, a.Log, a.Configuration)
			if err != nil {
				a.Log.Error("could not start agent websocket proxy", zap.Error(err))
				return
			}
			apiSrv.Start(stage)
			privateApiSrv.Start(stage)
		},
		// Start modules.
		func(stage stager.Stage) {
			startModules(stage, afterServersModules)
		},
	)
}

func (a *ConfiguredApp) constructPluralRpcApiFactory(errRep errz.ErrReporter, sentryHub *sentry.Hub, redisClient rueidis.Client, dt trace.Tracer) (modserver2.RpcApiFactory, modserver2.AgentRpcApiFactory) {
	aCfg := a.Configuration.Agent
	f := serverRpcApiFactory{
		log:       a.Log,
		sentryHub: sentryHub,
	}
	fAgent := plural.ServerAgentRpcApiFactory{
		RPCApiFactory: f.New,
		AgentInfoCache: cache.NewWithError[api.AgentToken, *api.AgentInfo](
			aCfg.InfoCacheTtl.AsDuration(),
			aCfg.InfoCacheErrorTtl.AsDuration(),
			&redistool2.ErrCacher[api.AgentToken]{
				Log:          a.Log,
				ErrRep:       errRep,
				Client:       redisClient,
				ErrMarshaler: prototool.ProtoErrMarshaler{},
				KeyToRedisKey: func(key api.AgentToken) string {
					return a.Configuration.Redis.KeyPrefix + ":agent_info_errs:" + string(api.AgentToken2key(key))
				},
			},
			dt,
			gapi.IsCacheableError,
		),
		PluralURL: a.Configuration.PluralUrl,
	}
	return f.New, fAgent.New
}

func (a *ConfiguredApp) constructAgentTracker(errRep errz.ErrReporter, redisClient rueidis.Client) agent_tracker.Tracker {
	cfg := a.Configuration
	return agent_tracker.NewRedisTracker(
		a.Log,
		errRep,
		redisClient,
		cfg.Redis.KeyPrefix+":agent_tracker2",
		cfg.Agent.RedisConnInfoTtl.AsDuration(),
		cfg.Agent.RedisConnInfoRefresh.AsDuration(),
		cfg.Agent.RedisConnInfoGc.AsDuration(),
	)
}

func (a *ConfiguredApp) constructSentryHub(tp trace.TracerProvider, mp otelmetric.MeterProvider, p propagation.TextMapPropagator) (*sentry.Hub, error) {
	s := a.Configuration.Observability.Sentry
	dialer := net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 30 * time.Second,
	}
	sentryClient, err := sentry.NewClient(sentry.ClientOptions{
		Dsn:         s.Dsn, // empty DSN disables Sentry transport
		SampleRate:  1,     // no sampling
		Release:     cmd.Version,
		Environment: s.Environment,
		HTTPTransport: otelhttp.NewTransport(
			&http.Transport{
				Proxy:                 http.ProxyFromEnvironment,
				DialContext:           dialer.DialContext,
				TLSClientConfig:       tlstool.DefaultClientTLSConfig(),
				MaxIdleConns:          10,
				IdleConnTimeout:       90 * time.Second,
				TLSHandshakeTimeout:   10 * time.Second,
				ResponseHeaderTimeout: 20 * time.Second,
				ForceAttemptHTTP2:     true,
			},
			otelhttp.WithPropagators(p),
			otelhttp.WithTracerProvider(tp),
			otelhttp.WithMeterProvider(mp),
		),
	})
	if err != nil {
		return nil, err
	}
	return sentry.NewHub(sentryClient, sentry.NewScope()), nil
}

func (a *ConfiguredApp) constructRedisClient(tp trace.TracerProvider, mp otelmetric.MeterProvider) (rueidis.Client, error) {
	cfg := a.Configuration.Redis
	dialTimeout := cfg.DialTimeout.AsDuration()
	writeTimeout := cfg.WriteTimeout.AsDuration()
	var err error
	var tlsConfig *tls.Config
	if cfg.Tls != nil && cfg.Tls.Enabled {
		tlsConfig, err = tlstool.DefaultClientTLSConfigWithCACertKeyPair(cfg.Tls.CaCertificateFile, cfg.Tls.CertificateFile, cfg.Tls.KeyFile)
		if err != nil {
			return nil, err
		}
	}
	var password string
	if cfg.PasswordFile != "" {
		passwordBytes, err := os.ReadFile(cfg.PasswordFile) // nolint:govet
		if err != nil {
			return nil, err
		}
		password = string(passwordBytes)
	}
	opts := rueidis.ClientOption{
		Dialer: net.Dialer{
			Timeout: dialTimeout,
		},
		TLSConfig:        tlsConfig,
		Username:         cfg.Username,
		Password:         password,
		ClientName:       kasName,
		ConnWriteTimeout: writeTimeout,
		MaxFlushDelay:    20 * time.Microsecond,
		DisableCache:     true,
		SelectDB:         int(cfg.DatabaseIndex),
	}
	if cfg.Network == "unix" {
		opts.DialFn = redistool2.UnixDialer
	}
	switch v := cfg.RedisConfig.(type) {
	case *kascfg.RedisCF_Server:
		opts.InitAddress = []string{v.Server.Address}
		if opts.TLSConfig != nil {
			opts.TLSConfig.ServerName, _, _ = strings.Cut(v.Server.Address, ":")
		}
	case *kascfg.RedisCF_Sentinel:
		opts.InitAddress = v.Sentinel.Addresses
		var sentinelPassword string
		if v.Sentinel.SentinelPasswordFile != "" {
			sentinelPasswordBytes, err := os.ReadFile(v.Sentinel.SentinelPasswordFile) // nolint:govet
			if err != nil {
				return nil, err
			}
			sentinelPassword = string(sentinelPasswordBytes)
		}
		opts.Sentinel = rueidis.SentinelOption{
			Dialer:    opts.Dialer,
			TLSConfig: opts.TLSConfig,
			MasterSet: v.Sentinel.MasterName,
			Username:  cfg.Username,
			Password:  sentinelPassword,
		}
	default:
		// This should never happen
		return nil, fmt.Errorf("unexpected Redis config type: %T", cfg.RedisConfig)
	}
	redisClient, err := rueidis.NewClient(opts)
	if err != nil {
		return nil, err
	}
	if a.isTracingEnabled() {
		// Instrument Redis client with tracing only if it's configured.
		redisClient, err = rueidisotel.NewClient(opts, rueidisotel.WithTracerProvider(tp), rueidisotel.WithMeterProvider(mp))
		if err != nil {
			return nil, err
		}
	}
	return redisClient, nil
}

func constructTracingExporter(ctx context.Context, tracingConfig *kascfg.TracingCF) (tracesdk.SpanExporter, error) {
	otlpEndpoint := tracingConfig.OtlpEndpoint

	u, err := url.Parse(otlpEndpoint)
	if err != nil {
		return nil, fmt.Errorf("parsing tracing url %s failed: %w", otlpEndpoint, err)
	}

	var otlpOptions []otlptracehttp.Option

	switch u.Scheme {
	case "https":
	case "http":
		otlpOptions = append(otlpOptions, otlptracehttp.WithInsecure())
	default:
		return nil, fmt.Errorf("unsupported schema of tracing url %q, only `http` and `https` are permitted", u.Scheme)
	}

	otlpOptions = append(otlpOptions, otlptracehttp.WithEndpoint(u.Host))
	otlpOptions = append(otlpOptions, otlptracehttp.WithURLPath(u.Path))

	otlpTokenSecretFile := tracingConfig.OtlpTokenSecretFile
	if otlpTokenSecretFile != nil {
		token, err := os.ReadFile(*otlpTokenSecretFile) // nolint: gosec, govet
		if err != nil {
			return nil, fmt.Errorf("unable to read OTLP token from %q: %w", *otlpTokenSecretFile, err)
		}
		token = bytes.TrimSpace(token)

		// This is just a temporary measure to allow for smooth migration from
		// Gitlab Observability UI tokens to Gitlab Access Tokens.
		// Issue: https://gitlab.com/gitlab-org/opstrace/opstrace/-/issues/2148
		//
		// The idea is simple - we try to determine the type of the token and
		// basing on it set correct HTTP headers. Gitlab
		// Observability Backend makes the decision which auth mechanism to use
		// basing on which HTTP header is present.
		headers := make(map[string]string)
		if bytes.HasPrefix(token, []byte("glpat-")) {
			headers["Private-Token"] = string(token)
		} else {
			headers[httpz.AuthorizationHeader] = fmt.Sprintf("Bearer %s", token)
		}

		otlpOptions = append(otlpOptions, otlptracehttp.WithHeaders(headers))
	}

	tlsConfig, err := tlstool.DefaultClientTLSConfigWithCACert(tracingConfig.GetOtlpCaCertificateFile())
	if err != nil {
		return nil, err
	}
	otlpOptions = append(otlpOptions, otlptracehttp.WithTLSClientConfig(tlsConfig))

	return otlptracehttp.New(ctx, otlpOptions...)
}

func (a *ConfiguredApp) constructOTELMeterProvider(r *resource.Resource, reg prometheus.Registerer) (*metricsdk.MeterProvider, func() error, error) {
	otelPromExp, err := promexp.New(promexp.WithRegisterer(reg))
	if err != nil {
		return nil, nil, err
	}
	mp := metricsdk.NewMeterProvider(metricsdk.WithReader(otelPromExp), metricsdk.WithResource(r))
	mpStop := func() error {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return mp.Shutdown(ctx)
	}
	return mp, mpStop, nil
}

func (a *ConfiguredApp) constructOTELTracingTools(ctx context.Context, r *resource.Resource) (trace.TracerProvider, propagation.TextMapPropagator, func() error, error) {
	if !a.isTracingEnabled() {
		return noop.NewTracerProvider(), propagation.NewCompositeTextMapPropagator(), func() error { return nil }, nil
	}

	// Exporter must be constructed right before TracerProvider as it's started implicitly so needs to be stopped,
	// which TracerProvider does in its Shutdown() method.
	exporter, err := constructTracingExporter(ctx, a.Configuration.Observability.Tracing)
	if err != nil {
		return nil, nil, nil, err
	}

	tp := tracesdk.NewTracerProvider(
		tracesdk.WithResource(r),
		tracesdk.WithBatcher(exporter),
	)
	p := propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{})
	tpStop := func() error {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return tp.Shutdown(ctx)
	}
	return tp, p, tpStop, nil
}

func (a *ConfiguredApp) isTracingEnabled() bool {
	return a.Configuration.Observability.Tracing != nil
}

func startModules(stage stager.Stage, modules []modserver2.Module) {
	for _, module := range modules {
		// closure captures the right variable
		stage.Go(func(ctx context.Context) error {
			err := module.Run(ctx)
			if err != nil {
				return fmt.Errorf("%s: %w", module.Name(), err)
			}
			return nil
		})
	}
}

func constructRedisReadinessProbe(redisClient rueidis.Client) observability.Probe {
	return func(ctx context.Context) error {
		pingCmd := redisClient.B().Ping().Build()
		err := redisClient.Do(ctx, pingCmd).Error()
		if err != nil {
			return fmt.Errorf("redis: %w", err)
		}
		return nil
	}
}

func constructOTELResource() (*resource.Resource, error) {
	return resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(kasName),
			semconv.ServiceVersion(cmd.Version),
		),
	)
}

func gitlabBuildInfoGauge(m otelmetric.Meter) error {
	// Only allocate the option once
	attributes := otelmetric.WithAttributeSet(attribute.NewSet(kasVersionAttr.String(cmd.Version), kasBuiltAttr.String(cmd.BuildTime)))
	_, err := m.Int64ObservableGauge(gitlabBuildInfoGaugeMetricName,
		otelmetric.WithDescription("Current build info for this Plural Service"),
		otelmetric.WithInt64Callback(func(ctx context.Context, observer otelmetric.Int64Observer) error {
			observer.Observe(1, attributes)
			return nil
		}),
	)
	return err
}

func maybeTLSCreds(certFile, keyFile string) ([]grpc.ServerOption, error) {
	config, err := tlstool.MaybeDefaultServerTLSConfig(certFile, keyFile)
	if err != nil {
		return nil, err
	}
	if config != nil {
		return []grpc.ServerOption{grpc.Creds(credentials.NewTLS(config))}, nil
	}
	return nil, nil
}

func kasServerName() string {
	return fmt.Sprintf("%s/%s/%s", kasName, cmd.Version, cmd.Commit)
}

var (
	_ redistool2.RpcApi = (*tokenLimiterApi)(nil)
)

type tokenLimiterApi struct {
	rpcApi modserver2.AgentRpcApi
}

func (a *tokenLimiterApi) Log() *zap.Logger {
	return a.rpcApi.Log()
}

func (a *tokenLimiterApi) HandleProcessingError(msg string, err error) {
	a.rpcApi.HandleProcessingError(a.rpcApi.Log(), modshared.NoAgentId, msg, err)
}

func (a *tokenLimiterApi) RequestKey() []byte {
	return api.AgentToken2key(a.rpcApi.AgentToken())
}

var (
	_ grpctool2.ServerErrorReporter = (*serverErrorReporter)(nil)
)

// serverErrorReporter implements the grpctool.ServerErrorReporter interface
// in order to report unknown grpc status code errors.
// In this case the errz.ErrReporter is used as a proxy for the modserver.RpcApi
// which logs and captures errors in Sentry.
type serverErrorReporter struct {
	log         *zap.Logger
	errReporter errz.ErrReporter
}

func (r *serverErrorReporter) Report(ctx context.Context, fullMethod string, err error) {
	r.errReporter.HandleProcessingError(ctx, r.log, fmt.Sprintf("Unknown gRPC error in %q", fullMethod), err)
}
