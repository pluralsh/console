package mock_modserver

import (
	"context"
	"testing"

	"github.com/pluralsh/kubernetes-agent/pkg/entity"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"

	"go.uber.org/zap/zaptest"
)

func IncomingAgentCtx(t *testing.T, rpcApi *MockAgentRpcApi) context.Context {
	rpcApi.EXPECT().
		AgentToken().
		Return(testhelpers.AgentkToken).
		AnyTimes()
	rpcApi.EXPECT().
		Log().
		Return(zaptest.NewLogger(t)).
		AnyTimes()
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	ctx = modserver.InjectAgentRpcApi(ctx, rpcApi)

	return ctx
}

func AgentMeta() *entity.AgentMeta {
	return &entity.AgentMeta{
		Version:      "v1.2.3",
		CommitId:     "32452345",
		PodNamespace: "ns1",
		PodName:      "n1",
	}
}
