package modserver

import (
	"context"

	grpc_middleware "github.com/grpc-ecosystem/go-grpc-middleware/v2"
	"go.uber.org/zap"
	"google.golang.org/grpc"

	"github.com/pluralsh/kubernetes-agent/pkg/api"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
)

type agentRpcApiKeyType int

const (
	agentRpcApiKey agentRpcApiKeyType = iota
)

// AgentRpcApi provides the API for the module's gRPC handlers to use.
// It should be used only by modules, that handle requests from agents.
type AgentRpcApi interface {
	modshared.RpcApi
	// AgentToken returns the token of an agent making the RPC.
	AgentToken() api.AgentToken
	// AgentInfo returns information about the agent making the RPC.
	// Returns a gRPC-compatible error.
	// Returns an error with the Unavailable code if there was a retriable error.
	// If there was an error, it takes care of tracking it via HandleProcessingError().
	AgentInfo(ctx context.Context, log *zap.Logger) (*api.AgentInfo, error)
}

type AgentRpcApiFactory func(ctx context.Context, fullMethodName string) (AgentRpcApi, error)

func InjectAgentRpcApi(ctx context.Context, rpcApi AgentRpcApi) context.Context {
	return context.WithValue(ctx, agentRpcApiKey, rpcApi)
}

func AgentRpcApiFromContext(ctx context.Context) AgentRpcApi {
	rpcApi, ok := ctx.Value(agentRpcApiKey).(AgentRpcApi)
	if !ok {
		// This is a programmer error, so panic.
		panic("modserver.AgentRpcApi not attached to context. Make sure you are using interceptors")
	}
	return rpcApi
}

// UnaryAgentRpcApiInterceptor returns a new unary server interceptor that augments connection context with a AgentRpcApi.
func UnaryAgentRpcApiInterceptor(factory AgentRpcApiFactory) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		rpcApi, err := factory(ctx, info.FullMethod)
		if err != nil {
			return nil, err
		}
		return handler(InjectAgentRpcApi(ctx, rpcApi), req)
	}
}

// StreamAgentRpcApiInterceptor returns a new stream server interceptor that augments connection context with a AgentRpcApi.
func StreamAgentRpcApiInterceptor(factory AgentRpcApiFactory) grpc.StreamServerInterceptor {
	return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		wrapper := grpc_middleware.WrapServerStream(ss)
		rpcApi, err := factory(wrapper.WrappedContext, info.FullMethod)
		if err != nil {
			return err
		}
		wrapper.WrappedContext = InjectAgentRpcApi(wrapper.WrappedContext, rpcApi)
		return handler(srv, wrapper)
	}
}
