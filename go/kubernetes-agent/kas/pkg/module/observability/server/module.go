package server

import (
	"context"
	"net"

	"github.com/pluralsh/kubernetes-agent/pkg/kascfg"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	observability2 "github.com/pluralsh/kubernetes-agent/pkg/module/observability"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"

	"github.com/prometheus/client_golang/prometheus"
	"go.uber.org/zap"
)

type module struct {
	log           *zap.Logger
	api           modshared.Api
	cfg           *kascfg.ObservabilityCF
	listener      func() (net.Listener, error)
	gatherer      prometheus.Gatherer
	registerer    prometheus.Registerer
	serverName    string
	probeRegistry *observability2.ProbeRegistry
}

func (m *module) Run(ctx context.Context) (retErr error) {
	lis, err := m.listener()
	if err != nil {
		return err
	}
	// Error is ignored because metricSrv.Run() closes the listener and
	// a second close always produces an error.
	defer lis.Close() // nolint:errcheck,gosec

	m.log.Info("Observability endpoint is up",
		logz.NetNetworkFromAddr(lis.Addr()),
		logz.NetAddressFromAddr(lis.Addr()),
	)

	metricSrv := observability2.MetricServer{
		Log:                   m.log,
		Api:                   m.api,
		Name:                  m.serverName,
		Listener:              lis,
		PrometheusUrlPath:     m.cfg.Prometheus.UrlPath,
		LivenessProbeUrlPath:  m.cfg.LivenessProbe.UrlPath,
		ReadinessProbeUrlPath: m.cfg.ReadinessProbe.UrlPath,
		Gatherer:              m.gatherer,
		Registerer:            m.registerer,
		ProbeRegistry:         m.probeRegistry,
	}
	return metricSrv.Run(ctx)
}

func (m *module) Name() string {
	return observability2.ModuleName
}
