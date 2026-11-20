package server

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"

	devboxv1 "github.com/pluralsh/console/go/kubernetes-agent/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/devbox"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/reverse_tunnel/tunnel"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/ioz"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/metric"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/retry"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/tlstool"
)

const (
	getAgentInfoInitBackoff   = 20 * time.Millisecond
	getAgentInfoMaxBackoff    = 100 * time.Millisecond
	getAgentInfoResetDuration = 10 * time.Second
	getAgentInfoBackoffFactor = 2.0
	getAgentInfoJitter        = 1.0
)

type Factory struct {
	// GatewayServer is the gRPC server behind the devbox listener. It must authenticate callers as agents
	// (modserver.AgentRpcApi from the cluster deploy token).
	GatewayServer *grpc.Server
	// TunnelHandler registers gateway tunnels.
	TunnelHandler tunnel.Handler
	// TunnelQuerier, when set, is used to fail calls for clusters without any gateway tunnel immediately.
	TunnelQuerier tunnel.Querier
	// GatewayConn sends calls to a gateway tunnel named by modserver.RoutingAgentIdMetadataKey, on any replica.
	GatewayConn grpc.ClientConnInterface
	// SetStreamsHandler receives the browser streams handler. It isn't called when streams are disabled.
	SetStreamsHandler func(http.Handler)
	// ConsoleConn replaces the connection to console's gRPC server, which is otherwise dialed from config.
	ConsoleConn grpc.ClientConnInterface
}

func (f *Factory) New(config *modserver.Config) (modserver.Module, error) {
	cfg := config.Config.Devbox
	m := &module{
		registerer: config.Registerer,
		metrics:    newMetrics(),
	}

	consoleConn := f.ConsoleConn
	if consoleConn == nil {
		conn, err := dialConsole(config)
		if err != nil {
			return nil, fmt.Errorf("devbox console connection: %w", err)
		}
		m.consoleConn = conn
		consoleConn = conn
	}

	ts := &tunnelServer{
		tunnelHandler: f.TunnelHandler,
		getAgentInfoPollConfig: retry.NewPollConfigFactory(0, retry.NewExponentialBackoffFactory(
			getAgentInfoInitBackoff,
			getAgentInfoMaxBackoff,
			getAgentInfoResetDuration,
			getAgentInfoBackoffFactor,
			getAgentInfoJitter,
		)),
		metrics: m.metrics,
	}
	f.GatewayServer.RegisterService(tunnelServiceDesc(ts), nil)

	is := &ingestServer{
		consoleConn: consoleConn,
		timeout:     cfg.Console.Timeout.AsDuration(),
	}
	f.GatewayServer.RegisterService(mungeServiceDesc(&devboxv1.Ingest_ServiceDesc, is.handle), nil)

	cs := &controlServer{
		gatewayConn:   f.GatewayConn,
		tunnelQuerier: f.TunnelQuerier,
	}
	config.ApiServer.RegisterService(mungeServiceDesc(&devboxv1.Control_ServiceDesc, cs.handle), nil)

	if secretFile := cfg.Streams.GetTokenSecretFile(); secretFile != "" {
		key, err := os.ReadFile(secretFile) // nolint: gosec
		if err != nil {
			return nil, fmt.Errorf("devbox stream token secret: %w", err)
		}
		key = bytes.TrimSpace(key)
		if len(key) == 0 {
			return nil, errors.New("devbox stream token secret file is empty")
		}
		f.SetStreamsHandler(&streamsHandler{
			log:           config.Log,
			api:           config.Api,
			urlPathPrefix: cfg.UrlPathPrefix,
			validator: &streamTokenValidator{
				key:      key,
				audience: cfg.Streams.TokenAudience,
				leeway:   cfg.Streams.TokenLeeway.AsDuration(),
			},
			gatewayConn:   f.GatewayConn,
			tunnelQuerier: f.TunnelQuerier,
			metrics:       m.metrics,
		})
	} else {
		config.Log.Info("Devbox streams are disabled: devbox.streams.token_secret_file is not set")
	}
	return m, nil
}

func dialConsole(config *modserver.Config) (*grpc.ClientConn, error) {
	cfg := config.Config.Devbox.Console
	secret, err := ioz.LoadBase64Secret(cfg.AuthenticationSecretFile)
	if err != nil {
		return nil, fmt.Errorf("auth secret file: %w", err)
	}
	transportCreds := insecure.NewCredentials()
	if cfg.Tls {
		tlsConfig, err := tlstool.DefaultClientTLSConfigWithCACert(cfg.CaCertificateFile)
		if err != nil {
			return nil, err
		}
		transportCreds = credentials.NewTLS(tlsConfig)
	}
	return grpc.NewClient(cfg.Address,
		grpc.WithTransportCredentials(transportCreds),
		grpc.WithPerRPCCredentials(&grpctool.JwtCredentials{
			Secret:   secret,
			Audience: devbox.ConsoleJwtAudience,
			Issuer:   config.KasName,
			Insecure: !cfg.Tls,
		}),
		grpc.WithStatsHandler(otelgrpc.NewClientHandler(
			otelgrpc.WithTracerProvider(config.TraceProvider),
			otelgrpc.WithMeterProvider(config.MeterProvider),
			otelgrpc.WithPropagators(config.TracePropagator),
		)),
		grpc.WithUserAgent(fmt.Sprintf("%s/%s/%s", config.KasName, config.Version, config.CommitId)),
	)
}

func (f *Factory) Name() string {
	return devbox.ModuleName
}

func (f *Factory) StartStopPhase() modshared.ModuleStartStopPhase {
	return modshared.ModuleStartBeforeServers
}

type module struct {
	registerer  prometheus.Registerer
	metrics     *metrics
	consoleConn *grpc.ClientConn
}

func (m *module) Run(ctx context.Context) error {
	collectors := m.metrics.collectors()
	if err := metric.Register(m.registerer, collectors...); err != nil {
		return err
	}
	defer func() {
		for _, c := range collectors {
			m.registerer.Unregister(c)
		}
	}()
	<-ctx.Done()
	if m.consoleConn != nil {
		return m.consoleConn.Close()
	}
	return nil
}

func (m *module) Name() string {
	return devbox.ModuleName
}
