package server

import (
	"context"
	"time"

	"go.uber.org/zap"

	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/module/usage_metrics"
	pluralapi "github.com/pluralsh/kubernetes-agent/pkg/plural/api"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/errz"
)

type module struct {
	log                  *zap.Logger
	api                  modserver.Api
	usageTracker         usage_metrics.UsageTrackerCollector
	usageReportingPeriod time.Duration
}

func (m *module) Run(ctx context.Context) error {
	if m.usageReportingPeriod == 0 {
		return nil
	}
	ticker := time.NewTicker(m.usageReportingPeriod)
	defer ticker.Stop()
	done := ctx.Done()
	for {
		select {
		case <-done:
			ctxExit, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			// Flush metrics before exiting
			m.sendUsage(ctxExit) // nolint: contextcheck
			cancel()
			return nil
		case <-ticker.C:
			m.sendUsage(ctx)
		}
	}
}

func (m *module) sendUsage(ctx context.Context) {
	if err := m.sendUsageInternal(ctx); err != nil {
		if !errz.ContextDone(err) {
			m.api.HandleProcessingError(ctx, m.log, modshared.NoAgentId, "Failed to send usage data", err)
		}
	}
}

func (m *module) sendUsageInternal(ctx context.Context) error {
	usageData := m.usageTracker.CloneUsageData()
	if usageData.IsEmpty() {
		return nil
	}
	data := pluralapi.UsagePingData{
		Counters:       usageData.Counters,
		UniqueCounters: usageData.UniqueCounters,
	}
	err := pluralapi.SendUsagePing(ctx, data)
	if err != nil {
		return err // don't wrap
	}
	// Subtract the increments we've just sent
	m.usageTracker.Subtract(usageData)
	return nil
}

func (m *module) Name() string {
	return usage_metrics.ModuleName
}
