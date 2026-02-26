package agent

import (
	"fmt"
	"time"

	"github.com/pluralsh/kubernetes-agent/pkg/module/agent_registrar"
	"github.com/pluralsh/kubernetes-agent/pkg/module/agent_registrar/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modagent"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/retry"
)

const (
	registerAttemptInterval = 5 * time.Minute
	registerInitBackoff     = 10 * time.Second
	registerMaxBackoff      = 5 * time.Minute
	registerResetDuration   = 10 * time.Minute
	registerBackoffFactor   = 2.0
	registerJitter          = 1.0
)

type Factory struct {
	PodId int64
}

func (f *Factory) IsProducingLeaderModules() bool {
	return false
}

func (f *Factory) Name() string {
	return agent_registrar.ModuleName
}

func (f *Factory) New(config *modagent.Config) (modagent.Module, error) {
	kubeClientset, err := config.K8sUtilFactory.KubernetesClientSet()
	if err != nil {
		return nil, fmt.Errorf("could not create kubernetes clientset: %w", err)
	}

	m := &module{
		Log:       config.Log,
		AgentMeta: config.AgentMeta,
		PodId:     f.PodId,
		PollConfig: retry.NewPollConfigFactory(registerAttemptInterval, retry.NewExponentialBackoffFactory(
			registerInitBackoff,
			registerMaxBackoff,
			registerResetDuration,
			registerBackoffFactor,
			registerJitter,
		)),
		Client:      rpc.NewAgentRegistrarClient(config.KasConn),
		KubeVersion: kubeClientset.Discovery(),
	}
	return m, nil
}

func (f *Factory) StartStopPhase() modshared.ModuleStartStopPhase {
	return modshared.ModuleStartBeforeServers
}
