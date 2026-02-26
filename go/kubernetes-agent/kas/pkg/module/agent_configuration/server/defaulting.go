package server

import (
	"time"

	"github.com/pluralsh/kubernetes-agent/pkg/kascfg"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
)

const (
	defaultAgentConfigurationPollPeriod               = 5 * time.Minute
	defaultAgentConfigurationMaxConfigurationFileSize = 128 * 1024
)

func ApplyDefaults(config *kascfg.ConfigurationFile) {
	prototool.NotNil(&config.Agent)
	prototool.NotNil(&config.Agent.Configuration)
	prototool.NotNil(&config.Agent.Listen)

	c := config.Agent.Configuration
	prototool.Duration(&c.PollPeriod, defaultAgentConfigurationPollPeriod)
	prototool.Uint32(&c.MaxConfigurationFileSize, defaultAgentConfigurationMaxConfigurationFileSize)
}
