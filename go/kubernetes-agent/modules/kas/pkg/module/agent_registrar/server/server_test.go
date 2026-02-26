package server

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/kubernetes-agent/pkg/api"
	"github.com/pluralsh/kubernetes-agent/pkg/module/agent_registrar/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/module/agent_tracker"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_agent_tracker"
	mock_modserver2 "github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modserver"
)

func TestRegister(t *testing.T) {
	mockRpcApi, mockAgentTracker, s, req, ctx := setupServer(t)

	mockRpcApi.EXPECT().
		Log().
		Return(zaptest.NewLogger(t))
	mockRpcApi.EXPECT().
		AgentInfo(gomock.Any(), gomock.Any()).
		Return(&api.AgentInfo{Id: 123, ClusterId: "456"}, nil)
	mockAgentTracker.EXPECT().
		RegisterConnection(gomock.Any(), gomock.Any()).
		Do(func(ctx context.Context, connectedAgentInfo *agent_tracker.ConnectedAgentInfo) error {
			assert.EqualValues(t, 123, connectedAgentInfo.AgentId)
			assert.EqualValues(t, "456", connectedAgentInfo.ClusterId)
			assert.EqualValues(t, 123456789, connectedAgentInfo.ConnectionId)
			return nil
		})

	resp, err := s.Register(ctx, req)
	assert.NotNil(t, resp)
	assert.NoError(t, err)
}

func TestRegister_AgentInfo_Error(t *testing.T) {
	mockRpcApi, _, s, req, ctx := setupServer(t)

	mockRpcApi.EXPECT().
		Log().
		Return(zaptest.NewLogger(t))
	mockRpcApi.EXPECT().
		AgentInfo(gomock.Any(), gomock.Any()).
		Return(nil, status.Error(codes.Unavailable, "Failed to register agent"))

	resp, err := s.Register(ctx, req)
	assert.Nil(t, resp)
	assert.Equal(t, codes.Unavailable, status.Code(err))
}

func TestRegister_registerAgent_Error(t *testing.T) {
	mockRpcApi, mockAgentTracker, s, req, ctx := setupServer(t)

	expectedErr := errors.New("expected error")

	mockRpcApi.EXPECT().
		Log().
		Return(zaptest.NewLogger(t))
	mockRpcApi.EXPECT().
		AgentInfo(gomock.Any(), gomock.Any()).
		Return(&api.AgentInfo{Id: 1, ClusterId: "1"}, nil)
	mockAgentTracker.EXPECT().
		RegisterConnection(gomock.Any(), gomock.Any()).
		Return(expectedErr)
	mockRpcApi.EXPECT().
		HandleProcessingError(gomock.Any(), gomock.Any(), gomock.Any(), expectedErr)

	resp, err := s.Register(ctx, req)
	assert.Nil(t, resp)
	assert.Equal(t, codes.Unavailable, status.Code(err))
}

func setupServer(t *testing.T) (*mock_modserver2.MockAgentRpcApi,
	*mock_agent_tracker.MockTracker, *server, *rpc.RegisterRequest, context.Context) {
	ctrl := gomock.NewController(t)

	mockRpcApi := mock_modserver2.NewMockAgentRpcApi(ctrl)
	mockAgentTracker := mock_agent_tracker.NewMockTracker(ctrl)

	s := &server{
		agentRegisterer: mockAgentTracker,
	}

	req := &rpc.RegisterRequest{
		AgentMeta: mock_modserver2.AgentMeta(),
		PodId:     123456789,
	}

	ctx := modserver.InjectAgentRpcApi(context.Background(), mockRpcApi)

	return mockRpcApi, mockAgentTracker, s, req, ctx
}
