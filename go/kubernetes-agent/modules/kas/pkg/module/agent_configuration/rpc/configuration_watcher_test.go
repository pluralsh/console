package rpc_test

import (
	"context"
	"io"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"
	"google.golang.org/protobuf/testing/protocmp"

	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	rpc2 "github.com/pluralsh/kubernetes-agent/pkg/module/agent_configuration/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/matcher"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

const (
	revision1 = "rev12341234"
	revision2 = "rev123412341"
)

var (
	projectId = "some/project"

	_ rpc2.ConfigurationWatcherInterface = &rpc2.ConfigurationWatcher{}
)

func TestConfigurationWatcher(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ctrl := gomock.NewController(t)
	client := mock_rpc.NewMockAgentConfigurationClient(ctrl)
	configStream := mock_rpc.NewMockAgentConfiguration_GetConfigurationClient[rpc2.ConfigurationResponse](ctrl)
	cfg1 := &agentcfg.AgentConfiguration{
		Gitops: &agentcfg.GitopsCF{
			ManifestProjects: []*agentcfg.ManifestProjectCF{
				{
					Id: &projectId,
				},
			},
		},
	}
	cfg2 := &agentcfg.AgentConfiguration{}
	gomock.InOrder(
		client.EXPECT().
			GetConfiguration(gomock.Any(), matcher.ProtoEq(t, &rpc2.ConfigurationRequest{
				SkipRegister: true,
			}), gomock.Any()).
			Return(configStream, nil),
		configStream.EXPECT().
			Recv().
			Return(&rpc2.ConfigurationResponse{
				Configuration: cfg1,
				CommitId:      revision1,
			}, nil),
		configStream.EXPECT().
			Recv().
			Return(&rpc2.ConfigurationResponse{
				Configuration: cfg2,
				CommitId:      revision2,
			}, nil),
		configStream.EXPECT().
			Recv().
			DoAndReturn(func() (*rpc2.ConfigurationResponse, error) {
				cancel()
				return nil, context.Canceled
			}),
	)
	w := rpc2.ConfigurationWatcher{
		Log:                zaptest.NewLogger(t),
		Client:             client,
		PollConfig:         testhelpers.NewPollConfig(0),
		ConfigPreProcessor: func(data rpc2.ConfigurationData) error { return nil },
	}
	iter := 0
	w.Watch(ctx, func(ctx context.Context, config rpc2.ConfigurationData) {
		switch iter {
		case 0:
			assert.Empty(t, cmp.Diff(config.Config, cfg1, protocmp.Transform()))
		case 1:
			assert.Empty(t, cmp.Diff(config.Config, cfg2, protocmp.Transform()))
		default:
			t.Fatal(iter)
		}
		iter++
	})
	assert.EqualValues(t, 2, iter)
}

func TestConfigurationWatcher_ResumeConnection(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ctrl := gomock.NewController(t)
	client := mock_rpc.NewMockAgentConfigurationClient(ctrl)
	configStream1 := mock_rpc.NewMockAgentConfiguration_GetConfigurationClient[rpc2.ConfigurationResponse](ctrl)
	configStream2 := mock_rpc.NewMockAgentConfiguration_GetConfigurationClient[rpc2.ConfigurationResponse](ctrl)
	gomock.InOrder(
		client.EXPECT().
			GetConfiguration(gomock.Any(), matcher.ProtoEq(t, &rpc2.ConfigurationRequest{
				SkipRegister: true,
			}), gomock.Any()).
			Return(configStream1, nil),
		configStream1.EXPECT().
			Recv().
			Return(&rpc2.ConfigurationResponse{
				Configuration: &agentcfg.AgentConfiguration{},
				CommitId:      revision1,
			}, nil),
		configStream1.EXPECT().
			Recv().
			Return(nil, io.EOF),
		client.EXPECT().
			GetConfiguration(gomock.Any(), matcher.ProtoEq(t, &rpc2.ConfigurationRequest{
				CommitId:     revision1,
				SkipRegister: true,
			}), gomock.Any()).
			Return(configStream2, nil),
		configStream2.EXPECT().
			Recv().
			DoAndReturn(func() (*rpc2.ConfigurationResponse, error) {
				cancel()
				return nil, context.Canceled
			}),
	)
	w := rpc2.ConfigurationWatcher{
		Log:                zaptest.NewLogger(t),
		Client:             client,
		PollConfig:         testhelpers.NewPollConfig(0),
		ConfigPreProcessor: func(data rpc2.ConfigurationData) error { return nil },
	}
	w.Watch(ctx, func(ctx context.Context, config rpc2.ConfigurationData) {
		// Don't care
	})
}

func TestConfigurationWatcher_ImmediateReconnectOnEOF(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ctrl := gomock.NewController(t)
	client := mock_rpc.NewMockAgentConfigurationClient(ctrl)
	configStream1 := mock_rpc.NewMockAgentConfiguration_GetConfigurationClient[rpc2.ConfigurationResponse](ctrl)
	configStream2 := mock_rpc.NewMockAgentConfiguration_GetConfigurationClient[rpc2.ConfigurationResponse](ctrl)
	cfg1 := &agentcfg.AgentConfiguration{
		Gitops: &agentcfg.GitopsCF{
			ManifestProjects: []*agentcfg.ManifestProjectCF{
				{
					Id: &projectId,
				},
			},
		},
	}
	gomock.InOrder(
		client.EXPECT().
			GetConfiguration(gomock.Any(), matcher.ProtoEq(t, &rpc2.ConfigurationRequest{
				SkipRegister: true,
			}), gomock.Any()).
			Return(configStream1, nil),
		configStream1.EXPECT().
			Recv().
			Return(&rpc2.ConfigurationResponse{
				Configuration: cfg1,
				CommitId:      revision1,
			}, nil),
		configStream1.EXPECT().
			Recv().
			Return(nil, io.EOF), // immediately retries after EOF
		client.EXPECT().
			GetConfiguration(gomock.Any(), matcher.ProtoEq(t, &rpc2.ConfigurationRequest{
				CommitId:     revision1,
				SkipRegister: true,
			}), gomock.Any()).
			Return(configStream2, nil),
		configStream2.EXPECT().
			Recv().
			DoAndReturn(func() (*rpc2.ConfigurationResponse, error) {
				cancel()
				return nil, context.Canceled
			}),
	)
	w := rpc2.ConfigurationWatcher{
		Log:                zaptest.NewLogger(t),
		Client:             client,
		PollConfig:         testhelpers.NewPollConfig(0),
		ConfigPreProcessor: func(data rpc2.ConfigurationData) error { return nil },
	}
	w.Watch(ctx, func(ctx context.Context, config rpc2.ConfigurationData) {
		// Don't care
	})
}
