package server

import (
	"github.com/pluralsh/kubernetes-agent/pkg/kascfg"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
)

const (
	defaultObservabilityListenNetwork         = "tcp"
	defaultObservabilityListenAddress         = "127.0.0.1:8151"
	defaultObservabilityPrometheusUrlPath     = "/metrics"
	defaultObservabilityLivenessProbeUrlPath  = "/liveness"
	defaultObservabilityReadinessProbeUrlPath = "/readiness"

	defaultGrpcLogLevel = kascfg.LogLevelEnum_error
)

func ApplyDefaults(config *kascfg.ConfigurationFile) {
	prototool.NotNil(&config.Observability)
	o := config.Observability

	prototool.NotNil(&o.Listen)
	prototool.StringPtr(&o.Listen.Network, defaultObservabilityListenNetwork)
	prototool.String(&o.Listen.Address, defaultObservabilityListenAddress)

	prototool.NotNil(&o.Prometheus)
	prototool.String(&o.Prometheus.UrlPath, defaultObservabilityPrometheusUrlPath)

	prototool.NotNil(&o.Sentry)

	prototool.NotNil(&o.Logging)
	if o.Logging.GrpcLevel == nil {
		x := defaultGrpcLogLevel
		o.Logging.GrpcLevel = &x
	}

	prototool.NotNil(&o.LivenessProbe)
	prototool.String(&o.LivenessProbe.UrlPath, defaultObservabilityLivenessProbeUrlPath)

	prototool.NotNil(&o.ReadinessProbe)
	prototool.String(&o.ReadinessProbe.UrlPath, defaultObservabilityReadinessProbeUrlPath)
}
