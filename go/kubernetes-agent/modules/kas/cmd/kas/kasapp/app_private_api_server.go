package kasapp

import (
	"context"
	"fmt"
	"math"
	"net"
	"os"
	"strconv"
	"time"

	"github.com/ash2k/stager"
	grpc_validator "github.com/grpc-ecosystem/go-grpc-middleware/v2/interceptors/validator"

	"github.com/pluralsh/kubernetes-agent/pkg/kascfg"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/observability"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/errz"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/ioz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/tlstool"

	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	otelmetric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/backoff"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/stats"
)

const (
	envVarOwnPrivateApiUrl    = "OWN_PRIVATE_API_URL"
	envVarOwnPrivateApiCidr   = "OWN_PRIVATE_API_CIDR"
	envVarOwnPrivateApiScheme = "OWN_PRIVATE_API_SCHEME"
	envVarOwnPrivateApiPort   = "OWN_PRIVATE_API_PORT"
	envVarOwnPrivateApiHost   = "OWN_PRIVATE_API_HOST"
)

type privateApiServer struct {
	log           *zap.Logger
	listenCfg     *kascfg.ListenPrivateApiCF
	ownUrl        string
	server        *grpc.Server
	inMemServer   *grpc.Server
	inMemListener net.Listener
	kasPool       grpctool2.PoolInterface
	auxCancel     context.CancelFunc
	ready         func()
}

func newPrivateApiServer(log *zap.Logger, errRep errz.ErrReporter, cfg *kascfg.ConfigurationFile, tp trace.TracerProvider,
	mp otelmetric.MeterProvider, p propagation.TextMapPropagator, csh, ssh stats.Handler, factory modserver.RpcApiFactory,
	probeRegistry *observability.ProbeRegistry,
	streamProm grpc.StreamServerInterceptor, unaryProm grpc.UnaryServerInterceptor,
	streamClientProm grpc.StreamClientInterceptor, unaryClientProm grpc.UnaryClientInterceptor,
	grpcServerErrorReporter grpctool2.ServerErrorReporter) (*privateApiServer, error) {
	listenCfg := cfg.PrivateApi.Listen
	jwtSecret, err := ioz.LoadBase64Secret(listenCfg.AuthenticationSecretFile)
	if err != nil {
		return nil, fmt.Errorf("auth secret file: %w", err)
	}

	ownUrl, err := constructOwnUrl(
		net.InterfaceAddrs,
		os.Getenv(envVarOwnPrivateApiUrl),
		os.Getenv(envVarOwnPrivateApiCidr),
		os.Getenv(envVarOwnPrivateApiScheme),
		os.Getenv(envVarOwnPrivateApiPort),
		*listenCfg.Network,
		listenCfg.Address,
	)
	if err != nil {
		return nil, err
	}
	log.Info("Using own private API URL", logz.Url(ownUrl))

	ownHost := os.Getenv(envVarOwnPrivateApiHost)

	// In-memory gRPC client->listener pipe
	listener := grpctool2.NewDialListener()

	// Client pool
	kasPool, err := newKasPool(log, errRep, tp, mp, p, csh, jwtSecret, ownUrl, ownHost,
		listenCfg.CaCertificateFile, listener.DialContext, streamClientProm, unaryClientProm)
	if err != nil {
		return nil, fmt.Errorf("kas pool: %w", err)
	}

	// Server
	auxCtx, auxCancel := context.WithCancel(context.Background()) // nolint: govet
	server, inMemServer, err := newPrivateApiServerImpl(auxCtx, cfg, tp, mp, p, ssh, jwtSecret, factory, ownHost, streamProm, unaryProm, grpcServerErrorReporter)
	if err != nil {
		return nil, fmt.Errorf("new server: %w", err) // nolint: govet
	}
	return &privateApiServer{
		log:           log,
		listenCfg:     listenCfg,
		ownUrl:        ownUrl,
		server:        server,
		inMemServer:   inMemServer,
		inMemListener: listener,
		kasPool:       kasPool,
		auxCancel:     auxCancel,
		ready:         probeRegistry.RegisterReadinessToggle("privateApiServer"),
	}, nil
}

func (s *privateApiServer) Start(stage stager.Stage) {
	stopInMem := make(chan struct{})
	grpctool2.StartServer(stage, s.inMemServer, func() (net.Listener, error) {
		return s.inMemListener, nil
	}, func() {
		<-stopInMem
	})
	grpctool2.StartServer(stage, s.server, func() (net.Listener, error) {
		lis, err := net.Listen(*s.listenCfg.Network, s.listenCfg.Address)
		if err != nil {
			return nil, err
		}
		addr := lis.Addr()
		s.log.Info("Private API endpoint is up",
			logz.NetNetworkFromAddr(addr),
			logz.NetAddressFromAddr(addr),
		)
		s.ready()
		return lis, nil
	}, func() {
		time.Sleep(s.listenCfg.ListenGracePeriod.AsDuration())
		close(stopInMem)
		s.auxCancel()
	})
}

// RegisterService should be used rather than directly registering on the field servers.
func (s *privateApiServer) RegisterService(desc *grpc.ServiceDesc, impl interface{}) {
	s.server.RegisterService(desc, impl)
	s.inMemServer.RegisterService(desc, impl)
}

func newPrivateApiServerImpl(auxCtx context.Context, cfg *kascfg.ConfigurationFile, tp trace.TracerProvider,
	mp otelmetric.MeterProvider, p propagation.TextMapPropagator, ssh stats.Handler, jwtSecret []byte, factory modserver.RpcApiFactory,
	ownPrivateApiHost string, streamProm grpc.StreamServerInterceptor, unaryProm grpc.UnaryServerInterceptor,
	grpcServerErrorReporter grpctool2.ServerErrorReporter) (*grpc.Server, *grpc.Server, error) {
	listenCfg := cfg.PrivateApi.Listen
	credsOpt, err := maybeTLSCreds(listenCfg.CertificateFile, listenCfg.KeyFile)
	if err != nil {
		return nil, nil, err
	}
	if ownPrivateApiHost == "" && len(credsOpt) > 0 {
		return nil, nil, fmt.Errorf("%s environment variable is not set. Set it to the kas' host name if you want to use TLS for kas->kas communication", envVarOwnPrivateApiHost)
	}

	jwtAuther := grpctool2.NewJWTAuther(jwtSecret, kasName, kasName, func(ctx context.Context) *zap.Logger {
		return modserver.RpcApiFromContext(ctx).Log()
	})

	keepaliveOpt, sh := grpctool2.MaxConnectionAge2GrpcKeepalive(auxCtx, listenCfg.MaxConnectionAge.AsDuration())
	sharedOpts := []grpc.ServerOption{
		keepaliveOpt,
		grpc.StatsHandler(otelgrpc.NewServerHandler(
			otelgrpc.WithTracerProvider(tp),
			otelgrpc.WithMeterProvider(mp),
			otelgrpc.WithPropagators(p),
			otelgrpc.WithMessageEvents(otelgrpc.ReceivedEvents, otelgrpc.SentEvents),
		)),
		grpc.StatsHandler(ssh),
		grpc.StatsHandler(sh),
		grpc.SharedWriteBuffer(true),
		grpc.ChainStreamInterceptor(
			streamProm, // 1. measure all invocations
			modserver.StreamRpcApiInterceptor(factory),                              // 2. inject RPC API
			jwtAuther.StreamServerInterceptor,                                       // 3. auth and maybe log
			grpc_validator.StreamServerInterceptor(),                                // x. wrap with validator
			grpctool2.StreamServerErrorReporterInterceptor(grpcServerErrorReporter), // nolint:contextcheck
		),
		grpc.ChainUnaryInterceptor(
			unaryProm, // 1. measure all invocations
			modserver.UnaryRpcApiInterceptor(factory), // 2. inject RPC API
			jwtAuther.UnaryServerInterceptor,          // 3. auth and maybe log
			grpc_validator.UnaryServerInterceptor(),   // x. wrap with validator
			grpctool2.UnaryServerErrorReporterInterceptor(grpcServerErrorReporter),
		),
		grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
			MinTime:             20 * time.Second,
			PermitWithoutStream: true,
		}),
		grpc.ForceServerCodec(grpctool2.RawCodecWithProtoFallback{}),
	}
	server := grpc.NewServer(append(credsOpt, sharedOpts...)...)
	inMemServer := grpc.NewServer(sharedOpts...)
	return server, inMemServer, nil
}

func newKasPool(log *zap.Logger, errRep errz.ErrReporter, tp trace.TracerProvider, mp otelmetric.MeterProvider,
	p propagation.TextMapPropagator, csh stats.Handler, jwtSecret []byte, ownPrivateApiUrl, ownPrivateApiHost, caCertificateFile string,
	dialer func(context.Context, string) (net.Conn, error),
	streamClientProm grpc.StreamClientInterceptor, unaryClientProm grpc.UnaryClientInterceptor) (grpctool2.PoolInterface, error) {
	sharedPoolOpts := []grpc.DialOption{
		grpc.WithSharedWriteBuffer(true),
		// Default gRPC parameters are good, no need to change them at the moment.
		// Specify them explicitly for discoverability.
		// See https://github.com/grpc/grpc/blob/master/doc/connection-backoff.md.
		grpc.WithConnectParams(grpc.ConnectParams{
			Backoff:           backoff.DefaultConfig,
			MinConnectTimeout: 20 * time.Second, // matches the default gRPC value.
		}),
		grpc.WithStatsHandler(otelgrpc.NewServerHandler(
			otelgrpc.WithTracerProvider(tp),
			otelgrpc.WithMeterProvider(mp),
			otelgrpc.WithPropagators(p),
			otelgrpc.WithMessageEvents(otelgrpc.ReceivedEvents, otelgrpc.SentEvents),
		)),
		grpc.WithStatsHandler(csh),
		grpc.WithUserAgent(kasServerName()),
		grpc.WithKeepaliveParams(keepalive.ClientParameters{
			Time:                55 * time.Second,
			PermitWithoutStream: true,
		}),
		grpc.WithPerRPCCredentials(&grpctool2.JwtCredentials{
			Secret:   jwtSecret,
			Audience: kasName,
			Issuer:   kasName,
			Insecure: true, // We may or may not have TLS setup, so always say creds don't need TLS.
		}),
		grpc.WithChainStreamInterceptor(
			streamClientProm,
			grpctool2.StreamClientValidatingInterceptor,
		),
		grpc.WithChainUnaryInterceptor(
			unaryClientProm,
			grpctool2.UnaryClientValidatingInterceptor,
		),
	}

	// Construct in-memory connection to private API gRPC server
	inMemConn, err := grpc.NewClient("passthrough:pipe", // nolint: contextcheck
		append([]grpc.DialOption{
			grpc.WithContextDialer(dialer),
			grpc.WithTransportCredentials(insecure.NewCredentials()),
		}, sharedPoolOpts...)...,
	)
	if err != nil {
		return nil, err
	}
	tlsCreds, err := tlstool.DefaultClientTLSConfigWithCACert(caCertificateFile)
	if err != nil {
		return nil, err
	}
	tlsCreds.ServerName = ownPrivateApiHost
	kasPool := grpctool2.NewPool(log, errRep, credentials.NewTLS(tlsCreds), sharedPoolOpts...)
	return grpctool2.NewPoolSelf(kasPool, ownPrivateApiUrl, inMemConn), nil
}

func constructOwnUrl(interfaceAddrs func() ([]net.Addr, error),
	ownUrl, ownCidr, ownScheme, ownPort, listenNetwork, listenAddress string) (string, error) {
	if ownUrl != "" {
		if ownCidr != "" {
			return "", fmt.Errorf("either %s or %s should be specified, not both", envVarOwnPrivateApiUrl, envVarOwnPrivateApiCidr)
		}
		return ownUrl, nil
	}

	// Determine port. 0 means not set
	port, err := detectOwnPort(ownPort)
	if err != nil {
		return "", err
	}

	// Determine scheme
	scheme, err := detectOwnScheme(ownScheme)
	if err != nil {
		return "", err
	}

	if ownCidr != "" {
		return detectUrlByCIDR(interfaceAddrs, ownCidr, scheme, port, listenNetwork, listenAddress)
	}

	return detectUrlFromListenAddress(scheme, listenNetwork, listenAddress)
}

func detectOwnScheme(ownScheme string) (string, error) {
	switch ownScheme {
	case "grpc", "grpcs":
		return ownScheme, nil
	case "":
		return "grpc", nil
	default:
		return "", fmt.Errorf("%s environment variable schould be either grpc or grpcs, got: %s", envVarOwnPrivateApiScheme, ownScheme)
	}
}

func detectOwnPort(ownPort string) (uint16, error) {
	if ownPort == "" {
		return 0, nil
	}
	port, err := strconv.ParseUint(ownPort, 10, 16)
	if err != nil {
		return 0, fmt.Errorf("error parsing %s environment variable: %w", envVarOwnPrivateApiPort, err)
	}
	if port == 0 || port > math.MaxUint16 { // mostly to check for 0, but do a full range check for completeness.
		return 0, fmt.Errorf("invalid port in %s environment variable: %d", envVarOwnPrivateApiPort, port)
	}
	return uint16(port), nil
}

func detectUrlByCIDR(interfaceAddrs func() ([]net.Addr, error),
	ownCidr, scheme string, port uint16, listenNetwork, listenAddress string) (string, error) {
	_, ipNet, err := net.ParseCIDR(ownCidr)
	if err != nil {
		return "", fmt.Errorf("failed to parse %s environment variable: %w", envVarOwnPrivateApiCidr, err)
	}
	addrs, err := interfaceAddrs()
	if err != nil {
		return "", fmt.Errorf("net.InterfaceAddrs(): %w", err)
	}
	var foundIPs []net.IP
	for _, addr := range addrs {
		addrIP, ok := addr.(*net.IPNet)
		if !ok {
			continue
		}
		if ipNet.Contains(addrIP.IP) {
			foundIPs = append(foundIPs, addrIP.IP)
		}
	}
	var ownIP net.IP
	switch len(foundIPs) {
	case 0:
		return "", fmt.Errorf("no IPs matched CIDR specified in the %s environment variable", envVarOwnPrivateApiCidr)
	case 1:
		ownIP = foundIPs[0]
	default:
		return "", fmt.Errorf("multiple IPs matched CIDR specified in the %s environment variable: %s", envVarOwnPrivateApiCidr, foundIPs)
	}
	var portStr string
	if port == 0 { // not specified, use port from listener
		switch listenNetwork {
		case "tcp", "tcp4", "tcp6": // assume listenAddress is a ip:port or name:port
			_, listenPort, err := net.SplitHostPort(listenAddress)
			if err != nil {
				return "", fmt.Errorf("listener address: %w", err)
			}
			portStr = listenPort
		// case "unix": We don't handle unix scheme here because we got OWN_PRIVATE_API_CIDR and hence presumably
		// user wants to use network, not unix socket.
		default:
			return "", fmt.Errorf("cannot determine port for own URL. Specify %s", envVarOwnPrivateApiPort)
		}
	} else {
		portStr = strconv.FormatInt(int64(port), 10)
	}
	return scheme + "://" + net.JoinHostPort(ownIP.String(), portStr), nil
}

func detectUrlFromListenAddress(scheme, listenNetwork, listenAddress string) (string, error) {
	switch listenNetwork {
	case "tcp", "tcp4", "tcp6": // assume listenAddress is a ip:port or name:port
		listenHost, _, err := net.SplitHostPort(listenAddress)
		if err != nil {
			return "", fmt.Errorf("listener address: %w", err)
		}
		ip := net.ParseIP(listenHost)
		if ip == nil || !ip.IsUnspecified() {
			// not an IP address or not a wildcard ip, use as is.
			return scheme + "://" + listenAddress, nil
		}
		// Which IP will be used for listening in case of a wildcard listen address depends on many things.
		// See https://github.com/golang/go/blob/go1.21.1/src/net/ipsock_posix.go#L73-L111.
		// Just report an error.
		return "", fmt.Errorf("could't determine own URL. Please set %s or %s environment variable", envVarOwnPrivateApiUrl, envVarOwnPrivateApiCidr)
	case "unix":
		return "unix://" + listenAddress, nil
	default:
		return "", fmt.Errorf("unsupported network type specified in the listener config: %s", listenNetwork)
	}
}
