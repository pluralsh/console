package kasapp

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/go-logr/zapr"
	"github.com/spf13/cobra"
	"go.opentelemetry.io/otel"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"go.uber.org/zap/zapgrpc"
	"google.golang.org/grpc/grpclog"
	"google.golang.org/protobuf/encoding/protojson"
	"k8s.io/klog/v2"
	"sigs.k8s.io/yaml"

	"github.com/pluralsh/console/go/kubernetes-agent/pkg/kascfg"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/errz"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/metric"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/prototool"
)

type App struct {
	ConfigurationFile string

	K8sProxyJWTAuthenticationSecretFile string
	K8sProxyAuditLogFlushInterval       string
	K8sProxyAuditLogFlushEvents         uint32
	K8sProxyAuditLogDrainTimeout        string
}

func (a *App) Run(ctx context.Context) (retErr error) {
	cfg, err := LoadConfigurationFile(a.ConfigurationFile)
	if err != nil {
		return err
	}
	ApplyDefaultsToKasConfigurationFile(cfg)
	err = a.applyConfigOverrides(cfg)
	if err != nil {
		return err
	}
	err = cfg.ValidateExtra()
	if err != nil {
		return fmt.Errorf("kascfg.ValidateExtra: %w", err)
	}
	log, grpcLog, err := loggerFromConfig(cfg.Observability.Logging)
	if err != nil {
		return err
	}
	defer errz.SafeCall(log.Sync, &retErr)
	defer errz.SafeCall(grpcLog.Sync, &retErr)
	grpclog.SetLoggerV2(zapgrpc.NewLogger(grpcLog)) // pipe gRPC logs into zap
	logrLogger := zapr.NewLogger(log)
	// Kubernetes uses klog so here we pipe all logs from it to our logger via an adapter.
	klog.SetLogger(logrLogger)
	otel.SetLogger(logrLogger)
	otel.SetErrorHandler((*metric.OtelErrorHandler)(log))
	app := ConfiguredApp{
		Log:           log,
		Configuration: cfg,
	}
	return app.Run(ctx)
}

func LoadConfigurationFile(configFile string) (*kascfg.ConfigurationFile, error) {
	configYAML, err := os.ReadFile(configFile) // nolint: gosec
	if err != nil {
		return nil, fmt.Errorf("configuration file: %w", err)
	}
	configJSON, err := yaml.YAMLToJSON(configYAML)
	if err != nil {
		return nil, fmt.Errorf("YAMLToJSON: %w", err)
	}
	cfg := &kascfg.ConfigurationFile{}
	err = protojson.Unmarshal(configJSON, cfg)
	if err != nil {
		return nil, fmt.Errorf("protojson.Unmarshal: %w", err)
	}
	err = cfg.ValidateAll()
	if err != nil {
		return nil, fmt.Errorf("kascfg.Validate: %w", err)
	}
	return cfg, nil
}

func NewCommand() *cobra.Command {
	a := App{}
	c := &cobra.Command{
		Use:   "kas",
		Short: "Plural Kubernetes Agent Server",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			return a.Run(cmd.Context())
		},
		SilenceErrors: true,
		SilenceUsage:  true,
	}
	c.Flags().StringVar(&a.ConfigurationFile, "configuration-file", "", "Configuration file to use (YAML)")
	c.Flags().StringVar(&a.K8sProxyJWTAuthenticationSecretFile, "k8s-proxy-jwt-authentication-secret-file", "",
		"Optional base64-encoded JWT secret file used for local proxy-token validation")
	c.Flags().StringVar(&a.K8sProxyAuditLogFlushInterval, "k8s-proxy-audit-log-flush-interval", "",
		"How often to flush buffered audit events (duration, e.g. 30s)")
	c.Flags().Uint32Var(&a.K8sProxyAuditLogFlushEvents, "k8s-proxy-audit-log-flush-events", 0,
		"Maximum number of buffered audit events before triggering an early flush")
	c.Flags().StringVar(&a.K8sProxyAuditLogDrainTimeout, "k8s-proxy-audit-log-drain-timeout", "",
		"How long to drain buffered audit events on shutdown (duration)")
	cobra.CheckErr(c.MarkFlagRequired("configuration-file"))

	return c
}

func (a *App) applyConfigOverrides(cfg *kascfg.ConfigurationFile) error {
	if cfg.Agent == nil || cfg.Agent.KubernetesApi == nil {
		return nil
	}
	k8sProxy := cfg.Agent.KubernetesApi

	if a.K8sProxyJWTAuthenticationSecretFile != "" {
		k8sProxy.JwtAuthenticationSecretFile = a.K8sProxyJWTAuthenticationSecretFile
	}
	if a.K8sProxyAuditLogFlushInterval != "" {
		d, err := time.ParseDuration(a.K8sProxyAuditLogFlushInterval)
		if err != nil {
			return fmt.Errorf("--k8s-proxy-audit-log-flush-interval: %w", err)
		}
		prototool.Duration(&k8sProxy.AuditLogFlushInterval, d)
	}
	if a.K8sProxyAuditLogFlushEvents > 0 {
		k8sProxy.AuditLogFlushEvents = a.K8sProxyAuditLogFlushEvents
	}
	if a.K8sProxyAuditLogDrainTimeout != "" {
		d, err := time.ParseDuration(a.K8sProxyAuditLogDrainTimeout)
		if err != nil {
			return fmt.Errorf("--k8s-proxy-audit-log-drain-timeout: %w", err)
		}
		prototool.Duration(&k8sProxy.AuditLogDrainTimeout, d)
	}

	return nil
}

func loggerFromConfig(loggingCfg *kascfg.LoggingCF) (*zap.Logger, *zap.Logger, error) {
	lockedSyncer := zapcore.Lock(logz.NoSync(os.Stderr))
	level, err := logz.LevelFromString(loggingCfg.Level.String())
	if err != nil {
		return nil, nil, err
	}
	grpcLevel, err := logz.LevelFromString(loggingCfg.GrpcLevel.String())
	if err != nil {
		return nil, nil, err
	}
	return loggerWithLevel(level, lockedSyncer), loggerWithLevel(grpcLevel, lockedSyncer), nil
}

func loggerWithLevel(level zapcore.LevelEnabler, sync zapcore.WriteSyncer) *zap.Logger {
	return zap.New(
		zapcore.NewCore(
			zapcore.NewJSONEncoder(logz.NewProductionEncoderConfig()),
			sync,
			level,
		),
		zap.ErrorOutput(sync),
	)
}
