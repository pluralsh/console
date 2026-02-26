package agent

import (
	"context"

	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	"github.com/pluralsh/kubernetes-agent/pkg/entity"
	"github.com/pluralsh/kubernetes-agent/pkg/module/agent_registrar"
	rpc2 "github.com/pluralsh/kubernetes-agent/pkg/module/agent_registrar/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/retry"

	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"
	"k8s.io/client-go/discovery"
)

type module struct {
	Log         *zap.Logger
	AgentMeta   *entity.AgentMeta
	PodId       int64
	PollConfig  retry.PollConfigFactory
	Client      rpc2.AgentRegistrarClient
	KubeVersion discovery.ServerVersionInterface
}

func (m *module) Run(ctx context.Context, cfg <-chan *agentcfg.AgentConfiguration) error {
	// Create a deep copy of agentMeta to prevent unexpected mutations
	agentMeta := proto.Clone(m.AgentMeta).(*entity.AgentMeta)

	_ = retry.PollWithBackoff(ctx, m.PollConfig(), func(ctx context.Context) (error, retry.AttemptResult) { // nolint:staticcheck
		// Retrieve and set the Kubernetes version
		version, err := m.KubeVersion.ServerVersion()
		if err == nil {
			agentMeta.KubernetesVersion.Major = version.Major
			agentMeta.KubernetesVersion.Minor = version.Minor
			agentMeta.KubernetesVersion.GitVersion = version.GitVersion
			agentMeta.KubernetesVersion.Platform = version.Platform
		} else {
			m.Log.Warn("Failed to fetch Kubernetes version", logz.Error(err))
		}

		_, err = m.Client.Register(ctx, &rpc2.RegisterRequest{
			AgentMeta: agentMeta,
			PodId:     m.PodId,
		})
		if err != nil {
			if !grpctool.RequestCanceledOrTimedOut(err) {
				m.Log.Error("Failed to register agent pod. Please make sure the agent version matches the server version", logz.Error(err))
			}
			return nil, retry.Backoff
		}

		return nil, retry.Continue
	})
	return nil
}

func (m *module) DefaultAndValidateConfiguration(config *agentcfg.AgentConfiguration) error {
	return nil
}

func (m *module) Name() string {
	return agent_registrar.ModuleName
}
