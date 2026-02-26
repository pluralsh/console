package kasapp

import (
	"io"
	"strings"

	grpc_middleware "github.com/grpc-ecosystem/go-grpc-middleware/v2"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"

	modserver2 "github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	rpc2 "github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
)

func (r *router) RouteToAgentStreamHandler(srv interface{}, stream grpc.ServerStream) error {
	ctx := stream.Context()
	md, _ := metadata.FromIncomingContext(ctx)
	agentId, err := agentIdFromMeta(md)
	if err != nil {
		return err
	}
	sts := grpc.ServerTransportStreamFromContext(ctx)
	service, method := grpctool.SplitGrpcMethod(sts.Method())
	// Overwrite incoming MD with sanitized MD
	wrappedStream := grpc_middleware.WrapServerStream(stream)
	wrappedStream.WrappedContext = metadata.NewIncomingContext(
		wrappedStream.WrappedContext,
		removeHopMeta(md),
	)
	ctx = wrappedStream.WrappedContext
	stream = wrappedStream
	rpcApi := modserver2.RpcApiFromContext(ctx)
	log := rpcApi.Log().With(logz.AgentId(agentId))
	tunnelFound, findHandle := r.tunnelFinder.FindTunnel(ctx, agentId, service, method)
	defer findHandle.Done(ctx)
	if !tunnelFound {
		err = stream.SendMsg(&GatewayKasResponse{
			Msg: &GatewayKasResponse_NoTunnel_{
				NoTunnel: &GatewayKasResponse_NoTunnel{},
			},
		})
		if err != nil {
			return rpcApi.HandleIoError(log, "SendMsg(GatewayKasResponse_NoTunnel) failed", err)
		}
	}
	tun, err := findHandle.Get(ctx)
	if err != nil {
		return err
	}
	defer tun.Done(ctx)
	err = stream.SendMsg(&GatewayKasResponse{
		Msg: &GatewayKasResponse_TunnelReady_{
			TunnelReady: &GatewayKasResponse_TunnelReady{},
		},
	})
	if err != nil {
		return rpcApi.HandleIoError(log, "SendMsg(GatewayKasResponse_TunnelReady) failed", err)
	}
	var start StartStreaming
	err = stream.RecvMsg(&start)
	if err != nil {
		if err == io.EOF { // nolint:errorlint
			// Routing kas decided not to proceed
			return nil
		}
		return err
	}
	return tun.ForwardStream(log, rpcApi, stream, newWrappingCallback(log, rpcApi, stream))
}

func removeHopMeta(md metadata.MD) metadata.MD {
	md = md.Copy()
	for k := range md {
		if strings.HasPrefix(k, modserver2.RoutingHopPrefix) {
			delete(md, k)
		}
	}
	return md
}

type wrappingCallback struct {
	log    *zap.Logger
	rpcApi modserver2.RpcApi
	stream grpc.ServerStream
}

func newWrappingCallback(log *zap.Logger, rpcApi modserver2.RpcApi, stream grpc.ServerStream) *wrappingCallback {
	return &wrappingCallback{
		log:    log,
		rpcApi: rpcApi,
		stream: stream,
	}
}

func (c *wrappingCallback) Header(md map[string]*prototool.Values) error {
	return c.sendMsg("SendMsg(GatewayKasResponse_Header) failed", &GatewayKasResponse{
		Msg: &GatewayKasResponse_Header_{
			Header: &GatewayKasResponse_Header{
				Meta: md,
			},
		},
	})
}

func (c *wrappingCallback) Message(data []byte) error {
	return c.sendMsg("SendMsg(GatewayKasResponse_Message) failed", &GatewayKasResponse{
		Msg: &GatewayKasResponse_Message_{
			Message: &GatewayKasResponse_Message{
				Data: data,
			},
		},
	})
}

func (c *wrappingCallback) Trailer(md map[string]*prototool.Values) error {
	return c.sendMsg("SendMsg(GatewayKasResponse_Trailer) failed", &GatewayKasResponse{
		Msg: &GatewayKasResponse_Trailer_{
			Trailer: &GatewayKasResponse_Trailer{
				Meta: md,
			},
		},
	})
}

func (c *wrappingCallback) Error(stat *rpc2.Error) error {
	return c.sendMsg("SendMsg(GatewayKasResponse_Error) failed", &GatewayKasResponse{
		Msg: &GatewayKasResponse_Error_{
			Error: &GatewayKasResponse_Error{
				Status: stat.Status,
			},
		},
	})
}

func (c *wrappingCallback) sendMsg(errMsg string, msg *GatewayKasResponse) error {
	err := c.stream.SendMsg(msg)
	if err != nil {
		return c.rpcApi.HandleIoError(c.log, errMsg, err)
	}
	return nil
}
