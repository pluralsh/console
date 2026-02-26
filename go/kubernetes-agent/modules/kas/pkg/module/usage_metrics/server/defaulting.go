package server

import (
	"time"

	"github.com/pluralsh/kubernetes-agent/pkg/kascfg"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
)

const (
	defaultObservabilityUsageReportingPeriod = 1 * time.Minute
)

func ApplyDefaults(config *kascfg.ConfigurationFile) {
	prototool.NotNil(&config.Observability)
	prototool.Duration(&config.Observability.UsageReportingPeriod, defaultObservabilityUsageReportingPeriod)
}
