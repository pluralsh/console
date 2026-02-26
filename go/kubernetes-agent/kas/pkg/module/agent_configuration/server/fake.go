//go:build exclude

package server

import (
	"context"

	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	"github.com/pluralsh/kubernetes-agent/pkg/api"
	rpc2 "github.com/pluralsh/kubernetes-agent/pkg/module/agent_configuration/rpc"
	agent_tracker2 "github.com/pluralsh/kubernetes-agent/pkg/module/agent_tracker"
	modserver2 "github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/mathz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/retry"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/syncz"

	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type fakeServer struct {
	rpc2.UnimplementedAgentConfigurationServer
	serverApi                  modserver2.Api
	agentRegisterer            agent_tracker2.Registerer
	maxConfigurationFileSize   int64
	getConfigurationPollConfig retry.PollConfigFactory
	gitLabExternalUrl          string
}

func (s *fakeServer) GetConfiguration(req *rpc2.ConfigurationRequest, server rpc2.AgentConfiguration_GetConfigurationServer) error {
	connectedAgentInfo := &agent_tracker2.ConnectedAgentInfo{
		AgentMeta:    req.AgentMeta,
		ConnectedAt:  timestamppb.Now(),
		ConnectionId: mathz.Int63(),
	}
	ctx := server.Context()
	rpcApi := modserver2.AgentRpcApiFromContext(ctx)
	log := rpcApi.Log()
	defer s.maybeUnregisterAgent(log, rpcApi, connectedAgentInfo, req.SkipRegister)

	pollCfg := s.getConfigurationPollConfig()

	wh := syncz.NewComparableWorkerHolder[string](
		func(projectId string) syncz.Worker {
			return syncz.WorkerFunc(func(ctx context.Context) {

			})
		},
	)
	defer wh.StopAndWait()

	return rpcApi.PollWithBackoff(pollCfg, func() (error, retry.AttemptResult) {
		// This call is made on each poll because:
		// - it checks that the agent's token is still valid
		// - repository location in Gitaly might have changed
		agentInfo, err := rpcApi.AgentInfo(ctx, log)
		if err != nil {
			if status.Code(err) == codes.Unavailable {
				return nil, retry.Backoff
			}
			return err, retry.Done
		}

		// re-define log to avoid accidentally using the old one
		log := log.With(logz.AgentId(agentInfo.Id)) // nolint:govet
		s.maybeRegisterAgent(ctx, log, rpcApi, connectedAgentInfo, agentInfo, req.SkipRegister)

		_ = s.fetchConfiguration(ctx, agentInfo)

		return nil, retry.Continue
	})
}

// fetchConfiguration fetches agent's configuration from a corresponding repository.
// Assumes configuration is stored in ".gitlab/agents/<agent id>/config.yaml" file.
// fetchConfiguration returns a wrapped context.Canceled, context.DeadlineExceeded or gRPC error if ctx signals done and interrupts a running gRPC call.
func (s *fakeServer) fetchConfiguration(_ context.Context, _ *api.AgentInfo) *agentcfg.ConfigurationFile {
	return &agentcfg.ConfigurationFile{
		Gitops:            nil,
		Observability:     nil,
		CiAccess:          nil,
		ContainerScanning: nil,
		UserAccess: &agentcfg.UserAccessCF{
			AccessAs: nil,
			Projects: nil,
			Groups:   nil,
		},
		RemoteDevelopment: nil,
		Flux:              nil,
	}
}

func (s *fakeServer) maybeRegisterAgent(ctx context.Context, log *zap.Logger, rpcApi modserver2.AgentRpcApi,
	connectedAgentInfo *agent_tracker2.ConnectedAgentInfo, agentInfo *api.AgentInfo, skipRegister bool) {
	// Skip registering agent if skipRegister is true. The agent will call "Register" gRPC method instead.
	if skipRegister {
		return
	}

	if connectedAgentInfo.AgentId != 0 {
		return
	}
	connectedAgentInfo.AgentId = agentInfo.Id
	connectedAgentInfo.ProjectId = agentInfo.ProjectId
	err := s.agentRegisterer.RegisterConnection(ctx, connectedAgentInfo)
	if err != nil {
		rpcApi.HandleProcessingError(log, agentInfo.Id, "Failed to register agent", err)
	}
}

func (s *fakeServer) maybeUnregisterAgent(log *zap.Logger, rpcApi modserver2.AgentRpcApi,
	connectedAgentInfo *agent_tracker2.ConnectedAgentInfo, skipRegister bool) {
	// Skip unregistering agent if skipRegister is true. GC will clean up the agent from the storage.
	if skipRegister {
		return
	}

	if connectedAgentInfo.AgentId == 0 {
		return
	}
	err := s.agentRegisterer.UnregisterConnection(context.Background(), connectedAgentInfo)
	if err != nil {
		rpcApi.HandleProcessingError(log, connectedAgentInfo.AgentId, "Failed to unregister agent", err)
	}
}
