package server

import (
	"time"

	"github.com/pluralsh/console/go/kubernetes-agent/pkg/kascfg"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/prototool"
)

const (
	defaultObservabilityUsageReportingPeriod = 1 * time.Minute
)

func ApplyDefaults(config *kascfg.ConfigurationFile) {
	prototool.NotNil(&config.Observability)
	prototool.Duration(&config.Observability.UsageReportingPeriod, defaultObservabilityUsageReportingPeriod)
}
