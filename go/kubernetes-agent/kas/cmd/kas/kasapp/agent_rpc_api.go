package kasapp

import (
	"context"
	"errors"
	"sync"

	grpc_auth "github.com/grpc-ecosystem/go-grpc-middleware/v2/interceptors/auth"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/kubernetes-agent/pkg/api"
	fake "github.com/pluralsh/kubernetes-agent/pkg/fake/api"
	gitlab2 "github.com/pluralsh/kubernetes-agent/pkg/gitlab"
	modserver2 "github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/cache"
)

type serverAgentRpcApi struct {
	modserver2.RpcApi
	Token           api.AgentToken
	GitLabClient    gitlab2.ClientInterface
	AgentInfoCache  *cache.CacheWithErr[api.AgentToken, *api.AgentInfo]
	agentIdAttrOnce sync.Once
}

func (a *serverAgentRpcApi) AgentToken() api.AgentToken {
	return a.Token
}

func (a *serverAgentRpcApi) AgentInfo(ctx context.Context, log *zap.Logger) (*api.AgentInfo, error) {
	agentInfo, err := a.getAgentInfoCached(ctx)
	switch {
	case err == nil:
		a.agentIdAttrOnce.Do(func() {
			trace.SpanFromContext(ctx).SetAttributes(api.TraceAgentIdAttr.Int64(agentInfo.Id))
		})
		return agentInfo, nil
	case errors.Is(err, context.Canceled):
		err = status.Error(codes.Canceled, err.Error())
	case errors.Is(err, context.DeadlineExceeded):
		err = status.Error(codes.DeadlineExceeded, err.Error())
	case gitlab2.IsForbidden(err):
		err = status.Error(codes.PermissionDenied, "forbidden")
	case gitlab2.IsUnauthorized(err):
		err = status.Error(codes.Unauthenticated, "unauthenticated")
	case gitlab2.IsNotFound(err):
		err = status.Error(codes.NotFound, "agent not found")
	default:
		a.HandleProcessingError(log, modshared.NoAgentId, "AgentInfo()", err)
		err = status.Error(codes.Unavailable, "unavailable")
	}
	return nil, err
}

func (a *serverAgentRpcApi) getAgentInfoCached(ctx context.Context) (*api.AgentInfo, error) {
	return a.AgentInfoCache.GetItem(ctx, a.Token, func() (*api.AgentInfo, error) {
		return fake.GetAgentInfo(ctx, a.Token, gitlab2.WithoutRetries())
	})
}

type serverAgentRpcApiFactory struct {
	rpcApiFactory  modserver2.RpcApiFactory
	gitLabClient   gitlab2.ClientInterface
	agentInfoCache *cache.CacheWithErr[api.AgentToken, *api.AgentInfo]
}

func (f *serverAgentRpcApiFactory) New(ctx context.Context, fullMethodName string) (modserver2.AgentRpcApi, error) {
	token, err := grpc_auth.AuthFromMD(ctx, "bearer")
	if err != nil {
		return nil, err
	}
	return &serverAgentRpcApi{
		RpcApi:         f.rpcApiFactory(ctx, fullMethodName),
		Token:          api.AgentToken(token),
		GitLabClient:   f.gitLabClient,
		AgentInfoCache: f.agentInfoCache,
	}, nil
}
