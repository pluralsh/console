package agentkapp

import (
	"bytes"
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/ash2k/stager"
	"github.com/go-logr/zapr"
	grpc_prometheus "github.com/grpc-ecosystem/go-grpc-middleware/providers/prometheus"
	"go.opentelemetry.io/otel/trace/noop"

	"github.com/pluralsh/kubernetes-agent/cmd"
	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	"github.com/pluralsh/kubernetes-agent/pkg/api"
	"github.com/pluralsh/kubernetes-agent/pkg/entity"
	rpc2 "github.com/pluralsh/kubernetes-agent/pkg/module/agent_configuration/rpc"
	agent_registrar_agent "github.com/pluralsh/kubernetes-agent/pkg/module/agent_registrar/agent"
	kubernetes_api_agent "github.com/pluralsh/kubernetes-agent/pkg/module/kubernetes_api/agent"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modagent"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	observability_agent "github.com/pluralsh/kubernetes-agent/pkg/module/observability/agent"
	reverse_tunnel_agent "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/agent"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/errz"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
	logz2 "github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/mathz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/metric"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/retry"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/tlstool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/wstunnel"

	"github.com/coder/websocket"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/spf13/cobra"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.opentelemetry.io/otel"
	otelmetric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"go.uber.org/zap/zapgrpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/backoff"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/encoding/gzip"
	"google.golang.org/grpc/grpclog"
	"google.golang.org/grpc/keepalive"
	core_v1 "k8s.io/api/core/v1"
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/kubernetes/scheme"
	client_core_v1 "k8s.io/client-go/kubernetes/typed/core/v1"
	"k8s.io/client-go/tools/record"
	"k8s.io/klog/v2"
	"k8s.io/kubectl/pkg/cmd/util"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	defaultLogLevel     agentcfg.LogLevelEnum = 3 // whatever is 0 is the default value
	defaultGrpcLogLevel                       = agentcfg.LogLevelEnum_error

	defaultObservabilityListenNetwork = "tcp"
	defaultObservabilityListenAddress = ":8080"
	defaultMaxMessageSize             = 10 * 1024 * 1024
	agentName                         = "gitlab-agent"

	envVarPodNamespace       = "POD_NAMESPACE"
	envVarPodName            = "POD_NAME"
	envVarServiceAccountName = "SERVICE_ACCOUNT_NAME"
	envVarAgentkToken        = "AGENTK_TOKEN"

	getConfigurationInitBackoff   = 10 * time.Second
	getConfigurationMaxBackoff    = 5 * time.Minute
	getConfigurationResetDuration = 10 * time.Minute
	getConfigurationBackoffFactor = 2.0
	getConfigurationJitter        = 1.0
)

type App struct {
	Log               *zap.Logger
	LogLevel          zap.AtomicLevel
	GrpcLogLevel      zap.AtomicLevel
	AgentMeta         *entity.AgentMeta
	AgentId           *ValueHolder[int64]
	GitLabExternalUrl *ValueHolder[url.URL]
	// KasAddress specifies the address of kas.
	KasAddress                 string
	KasCACertFile              string
	KasHeaders                 []string
	KasSkipTLSVerify           bool
	KasTLSServerName           string
	ServiceAccountName         string
	ObservabilityListenNetwork string
	ObservabilityListenAddress string
	ObservabilityCertFile      string
	ObservabilityKeyFile       string
	TokenFile                  string
	AgentToken                 api.AgentToken
	K8sClientGetter            genericclioptions.RESTClientGetter
}

func (a *App) Run(ctx context.Context) (retErr error) {
	// podId is used to distinguish agentk pods from each other.
	podId := mathz.Int63()

	// Metrics
	reg := prometheus.NewPedanticRegistry()
	goCollector := collectors.NewGoCollector()
	procCollector := collectors.NewProcessCollector(collectors.ProcessCollectorOpts{})
	srvProm := grpc_prometheus.NewServerMetrics()
	clientProm := grpc_prometheus.NewClientMetrics()
	err := metric.Register(reg, goCollector, procCollector, srvProm, clientProm)
	if err != nil {
		return err
	}
	streamProm := srvProm.StreamServerInterceptor()
	unaryProm := srvProm.UnaryServerInterceptor()
	streamClientProm := clientProm.StreamClientInterceptor()
	unaryClientProm := clientProm.UnaryClientInterceptor()

	// TODO Tracing
	tp := noop.NewTracerProvider()
	p := propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{})

	// TODO metrics via OTEL
	mp := otel.GetMeterProvider()

	// Construct gRPC connection to gitlab-kas
	kasConn, err := a.constructKasConnection(ctx, tp, mp, p, streamClientProm, unaryClientProm)
	if err != nil {
		return err
	}
	defer errz.SafeClose(kasConn, &retErr)

	// Construct internal gRPC server
	internalSrv, err := newInternalServer(a.Log, tp, mp, p, streamProm, unaryProm) // nolint: contextcheck
	if err != nil {
		return err
	}
	defer errz.SafeClose(internalSrv.conn, &retErr)

	// Construct Kubernetes tools.
	k8sFactory := util.NewFactory(a.K8sClientGetter)
	kubeClient, err := k8sFactory.KubernetesClientSet()
	if err != nil {
		return err
	}

	// Construct event recorder
	eventBroadcaster := record.NewBroadcaster()
	eventRecorder := eventBroadcaster.NewRecorder(scheme.Scheme, core_v1.EventSource{Component: agentName})

	// Construct leader runner
	lr := newLeaderRunner(&leaseLeaderElector{
		namespace: a.AgentMeta.PodNamespace,
		name: func(ctx context.Context) (string, error) {
			id, err := a.AgentId.get(ctx) // nolint: govet
			if err != nil {
				return "", err
			}
			// We use agent id as part of lock name so that agentk Pods of different id don't compete with
			// each other. Only Pods with same agent id should compete for a lock. Put differently, agentk Pods
			// with same agent id have the same lock name but with different id have different lock name.
			return fmt.Sprintf("agent-%d-lock", id), nil
		},
		identity:           a.AgentMeta.PodName,
		coordinationClient: kubeClient.CoordinationV1(),
		eventRecorder:      eventRecorder,
	})

	// Construct agent modules
	beforeServersModules, afterServersModules, err := a.constructModules(internalSrv.server, kasConn, internalSrv.conn, k8sFactory, lr, reg, podId)
	if err != nil {
		return err
	}
	runner := a.newModuleRunner(kasConn)
	beforeServersModulesRun := runner.RegisterModules(beforeServersModules)
	afterServersModulesRun := runner.RegisterModules(afterServersModules)

	// Start events processing pipeline.
	loggingWatch := eventBroadcaster.StartStructuredLogging(0)
	defer loggingWatch.Stop()
	eventBroadcaster.StartRecordingToSink(&client_core_v1.EventSinkImpl{Interface: kubeClient.CoreV1().Events("")})
	defer eventBroadcaster.Shutdown()

	// Start things up. Stages are shut down in reverse order.
	return stager.RunStages(ctx,
		func(stage stager.Stage) {
			stage.Go(func(ctx context.Context) error {
				// Start leader runner.
				lr.Run(ctx)
				return nil
			})
		},
		func(stage stager.Stage) {
			// Start modules.
			stage.Go(beforeServersModulesRun)
		},
		func(stage stager.Stage) {
			// Start internal gRPC server. It is used by internal modules, so it is shut down after them.
			internalSrv.Start(stage)
		},
		func(stage stager.Stage) {
			// Start modules that use internal server.
			stage.Go(afterServersModulesRun)
		},
		func(stage stager.Stage) {
			// Start configuration refresh.
			stage.Go(runner.RunConfigurationRefresh)
		},
	)
}

func (a *App) newModuleRunner(kasConn *grpc.ClientConn) *moduleRunner {
	return &moduleRunner{
		log: a.Log,
		configurationWatcher: &rpc2.ConfigurationWatcher{
			Log:       a.Log,
			AgentMeta: a.AgentMeta,
			Client:    rpc2.NewAgentConfigurationClient(kasConn),
			PollConfig: retry.NewPollConfigFactory(0, retry.NewExponentialBackoffFactory(
				getConfigurationInitBackoff,
				getConfigurationMaxBackoff,
				getConfigurationResetDuration,
				getConfigurationBackoffFactor,
				getConfigurationJitter,
			)),
			ConfigPreProcessor: func(data rpc2.ConfigurationData) error {
				err := a.AgentId.set(data.Config.AgentId)
				if err != nil {
					return err
				}
				u, err := url.Parse(data.Config.GitlabExternalUrl)
				if err != nil {
					return fmt.Errorf("unable to parse configured GitLab External URL %q: %w", data.Config.GitlabExternalUrl, err)
				}
				return a.GitLabExternalUrl.set(*u)
			},
		},
	}
}

func (a *App) constructModules(internalServer *grpc.Server, kasConn, internalServerConn grpc.ClientConnInterface,
	k8sFactory util.Factory, lr *leaderRunner, reg *prometheus.Registry, podId int64) ([]modagent.Module, []modagent.Module, error) {
	factories := []modagent.Factory{
		&observability_agent.Factory{
			LogLevel:            a.LogLevel,
			GrpcLogLevel:        a.GrpcLogLevel,
			DefaultGrpcLogLevel: defaultGrpcLogLevel,
			Gatherer:            reg,
			Registerer:          reg,
			ListenNetwork:       a.ObservabilityListenNetwork,
			ListenAddress:       a.ObservabilityListenAddress,
			CertFile:            a.ObservabilityCertFile,
			KeyFile:             a.ObservabilityKeyFile,
		},
		&reverse_tunnel_agent.Factory{
			InternalServerConn: internalServerConn,
		},
		&kubernetes_api_agent.Factory{},
		&agent_registrar_agent.Factory{
			PodId: podId,
		},
	}
	var beforeServersModules, afterServersModules []modagent.Module
	for _, f := range factories {
		moduleName := f.Name()
		module, err := f.New(&modagent.Config{
			Log:       a.Log.With(logz2.ModuleName(moduleName)),
			AgentMeta: a.AgentMeta,
			Api: &agentAPI{
				moduleName:        moduleName,
				agentId:           a.AgentId,
				gitLabExternalUrl: a.GitLabExternalUrl,
			},
			K8sUtilFactory:     k8sFactory,
			KasConn:            kasConn,
			Server:             internalServer,
			AgentName:          agentName,
			ServiceAccountName: a.ServiceAccountName,
		})
		if err != nil {
			return nil, nil, err
		}
		if f.IsProducingLeaderModules() {
			module = lr.WrapModule(module)
		}
		phase := f.StartStopPhase()
		switch phase {
		case modshared.ModuleStartBeforeServers:
			beforeServersModules = append(beforeServersModules, module)
		case modshared.ModuleStartAfterServers:
			afterServersModules = append(afterServersModules, module)
		default:
			return nil, nil, fmt.Errorf("invalid StartStopPhase from factory %s: %d", moduleName, phase)
		}
	}
	return beforeServersModules, afterServersModules, nil
}

func (a *App) constructKasConnection(ctx context.Context, tp trace.TracerProvider, mp otelmetric.MeterProvider,
	p propagation.TextMapPropagator, streamClientProm grpc.StreamClientInterceptor, unaryClientProm grpc.UnaryClientInterceptor) (*grpc.ClientConn, error) {
	tlsConfig, err := tlstool.DefaultClientTLSConfigWithCACert(a.KasCACertFile)
	if err != nil {
		return nil, err
	}
	tlsConfig.InsecureSkipVerify = a.KasSkipTLSVerify
	tlsConfig.ServerName = a.KasTLSServerName
	u, err := url.Parse(a.KasAddress)
	if err != nil {
		return nil, fmt.Errorf("invalid gitlab-kas address: %w", err)
	}
	kasHeaders, err := parseHeaders(a.KasHeaders)
	if err != nil {
		return nil, err
	}
	userAgent := fmt.Sprintf("%s/%s/%s", agentName, a.AgentMeta.Version, a.AgentMeta.CommitId)
	opts := []grpc.DialOption{
		grpc.WithStatsHandler(otelgrpc.NewServerHandler(
			otelgrpc.WithTracerProvider(tp),
			otelgrpc.WithMeterProvider(mp),
			otelgrpc.WithPropagators(p),
			otelgrpc.WithMessageEvents(otelgrpc.ReceivedEvents, otelgrpc.SentEvents),
		)),
		// Default gRPC parameters are good, no need to change them at the moment.
		// Specify them explicitly for discoverability.
		// See https://github.com/grpc/grpc/blob/master/doc/connection-backoff.md.
		grpc.WithConnectParams(grpc.ConnectParams{
			Backoff:           backoff.DefaultConfig,
			MinConnectTimeout: 20 * time.Second, // matches the default gRPC value.
		}),
		grpc.WithSharedWriteBuffer(true),
		grpc.WithDefaultCallOptions(grpc.UseCompressor(gzip.Name)),
		grpc.WithUserAgent(userAgent),
		// keepalive.ClientParameters must be specified at least as large as what is allowed by the
		// server-side grpc.KeepaliveEnforcementPolicy
		grpc.WithKeepaliveParams(keepalive.ClientParameters{
			// kas allows min 20 seconds, trying to stay below 60 seconds (typical load-balancer timeout) and
			// above kas' server keepalive Time so that kas pings the client sometimes. This helps mitigate
			// reverse-proxies' enforced server response timeout.
			Time:                55 * time.Second,
			PermitWithoutStream: true,
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
	var addressToDial string
	// "grpcs" is the only scheme where encryption is done by gRPC.
	// "wss" is secure too but gRPC cannot know that, so we tell it it's not.
	secure := u.Scheme == "grpcs"
	switch u.Scheme {
	case "ws", "wss":
		addressToDial = "passthrough:" + a.KasAddress
		dialer := net.Dialer{
			Timeout:   30 * time.Second,
			KeepAlive: 30 * time.Second,
		}
		kasHeaders.Set(httpz.UserAgentHeader, userAgent)
		opts = append(opts, grpc.WithContextDialer(wstunnel.DialerForGRPC(defaultMaxMessageSize, &websocket.DialOptions{
			HTTPClient: &http.Client{
				Transport: &http.Transport{
					Proxy:                 http.ProxyFromEnvironment,
					DialContext:           dialer.DialContext,
					TLSClientConfig:       tlsConfig,
					MaxIdleConns:          10,
					IdleConnTimeout:       90 * time.Second,
					TLSHandshakeTimeout:   10 * time.Second,
					ResponseHeaderTimeout: 20 * time.Second,
				},
				CheckRedirect: func(req *http.Request, via []*http.Request) error {
					return http.ErrUseLastResponse
				},
			},
			HTTPHeader:      kasHeaders,
			CompressionMode: websocket.CompressionDisabled,
		})))
	case "grpc":
		// See https://github.com/grpc/grpc/blob/master/doc/naming.md.
		addressToDial = "dns:" + grpctool2.HostWithPort(u)
		opts = append(opts,
			grpc.WithPerRPCCredentials(grpctool2.NewHeaderMetadata(kasHeaders, !secure)),
			// See https://github.com/grpc/grpc/blob/master/doc/service_config.md.
			// See https://github.com/grpc/grpc/blob/master/doc/load-balancing.md.
			grpc.WithDefaultServiceConfig(`{"loadBalancingConfig":[{"round_robin":{}}]}`),
		)
	case "grpcs":
		// See https://github.com/grpc/grpc/blob/master/doc/naming.md.
		addressToDial = "dns:" + grpctool2.HostWithPort(u)
		opts = append(opts,
			grpc.WithTransportCredentials(credentials.NewTLS(tlsConfig)),
			grpc.WithPerRPCCredentials(grpctool2.NewHeaderMetadata(kasHeaders, !secure)),
			// See https://github.com/grpc/grpc/blob/master/doc/service_config.md.
			// See https://github.com/grpc/grpc/blob/master/doc/load-balancing.md.
			grpc.WithDefaultServiceConfig(`{"loadBalancingConfig":[{"round_robin":{}}]}`),
		)
	default:
		return nil, fmt.Errorf("unsupported scheme in GitLab Kubernetes Agent Server address: %q", u.Scheme)
	}
	if !secure {
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	}
	opts = append(opts, grpc.WithPerRPCCredentials(grpctool2.NewTokenCredentials(a.AgentToken, !secure)))
	conn, err := grpc.NewClient(addressToDial, opts...)
	if err != nil {
		return nil, fmt.Errorf("gRPC.dial: %w", err)
	}
	return conn, nil
}

func NewCommand() *cobra.Command {
	kubeConfigFlags := genericclioptions.NewConfigFlags(true)
	a := App{
		AgentMeta: &entity.AgentMeta{
			Version:           cmd.Version,
			CommitId:          cmd.Commit,
			KubernetesVersion: &entity.KubernetesVersion{},
		},
		AgentId:            NewValueHolder[int64](),
		GitLabExternalUrl:  NewValueHolder[url.URL](),
		ServiceAccountName: os.Getenv(envVarServiceAccountName),
		K8sClientGetter:    kubeConfigFlags,
	}
	c := &cobra.Command{
		Use:   "agentk",
		Short: "GitLab Agent for Kubernetes",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) (retErr error) {
			podNs := os.Getenv(envVarPodNamespace)
			if podNs == "" {
				return fmt.Errorf("%s environment variable is required but is empty", envVarPodNamespace)
			}
			podName := os.Getenv(envVarPodName)
			if podName == "" {
				return fmt.Errorf("%s environment variable is required but is empty", envVarPodName)
			}

			tokenFromEnv, ok := os.LookupEnv(envVarAgentkToken)
			switch {
			case a.TokenFile != "" && ok:
				return fmt.Errorf("unable to use both token file and %s environment variable to set the agent token", envVarAgentkToken)
			case a.TokenFile != "":
				tokenData, err := os.ReadFile(a.TokenFile)
				if err != nil {
					return fmt.Errorf("token file: %w", err)
				}
				tokenData = bytes.TrimSuffix(tokenData, []byte{'\n'})
				a.AgentToken = api.AgentToken(tokenData)
			case ok:
				a.AgentToken = api.AgentToken(tokenFromEnv)
				err := os.Unsetenv(envVarAgentkToken)
				if err != nil {
					return fmt.Errorf("failed to unset env var: %w", err)
				}
			default:
				return fmt.Errorf("agent token not set. Please set either token file or %s environment variable", envVarAgentkToken)
			}

			a.AgentMeta.PodNamespace = podNs
			a.AgentMeta.PodName = podName
			lockedSyncer := zapcore.Lock(logz2.NoSync(os.Stderr))
			var err error
			a.Log, a.LogLevel, err = a.logger(defaultLogLevel, lockedSyncer)
			if err != nil {
				return err
			}
			defer errz.SafeCall(a.Log.Sync, &retErr)

			var grpcLog *zap.Logger
			grpcLog, a.GrpcLogLevel, err = a.logger(defaultGrpcLogLevel, lockedSyncer)
			if err != nil {
				return err
			}
			defer errz.SafeCall(grpcLog.Sync, &retErr)

			grpclog.SetLoggerV2(zapgrpc.NewLogger(grpcLog)) // pipe gRPC logs into zap
			logrLogger := zapr.NewLogger(a.Log)
			// Kubernetes uses klog so here we pipe all logs from it to our logger via an adapter.
			klog.SetLogger(logrLogger)
			log.SetLogger(logrLogger) // controller-runtime is a special snowflake, why not use klog like all of Kubernetes?!
			otel.SetLogger(logrLogger)
			otel.SetErrorHandler((*metric.OtelErrorHandler)(a.Log))

			return a.Run(cmd.Context())
		},
		SilenceErrors: true,
		SilenceUsage:  true,
	}
	f := c.Flags()
	f.StringVar(&a.KasAddress, "kas-address", "", "GitLab Kubernetes Agent Server address")
	f.StringVar(&a.TokenFile, "token-file", "", "File with access token")

	f.StringVar(&a.KasCACertFile, "ca-cert-file", "", "File with X.509 certificate authority certificate in PEM format. Used for verifying cert of agent server")
	f.StringArrayVar(&a.KasHeaders, "kas-header", []string{}, "HTTP headers to set when connecting to the agent server")
	f.BoolVar(&a.KasSkipTLSVerify, "kas-insecure-skip-tls-verify", false, "If true, the agent server's certificate will not be checked for validity. This will make the connection insecure")
	f.StringVar(&a.KasTLSServerName, "kas-tls-server-name", "", "Server name to use for agent server certificate validation. If it is not provided, the hostname used to contact the server is used")

	f.StringVar(&a.ObservabilityListenNetwork, "observability-listen-network", defaultObservabilityListenNetwork, "Observability network to listen on")
	f.StringVar(&a.ObservabilityListenAddress, "observability-listen-address", defaultObservabilityListenAddress, "Observability address to listen on")
	f.StringVar(&a.ObservabilityCertFile, "observability-cert-file", "", "File with X.509 certificate in PEM format for observability endpoint TLS")
	f.StringVar(&a.ObservabilityKeyFile, "observability-key-file", "", "File with X.509 key in PEM format for observability endpoint TLS")

	kubeConfigFlags.AddFlags(f)
	cobra.CheckErr(c.MarkFlagRequired("kas-address"))
	return c
}

func parseHeaders(raw []string) (http.Header, error) {
	header := http.Header{}
	for _, h := range raw {
		k, v, ok := strings.Cut(h, ":")
		if !ok {
			return nil, fmt.Errorf("invalid header supplied: %s", h)
		}
		k, v = strings.Trim(k, " "), strings.Trim(v, " ")
		if len(k) < 1 || len(v) < 1 {
			return nil, fmt.Errorf("invalid header supplied: %s", h)
		}
		header.Add(k, v)
	}
	return header, nil
}
