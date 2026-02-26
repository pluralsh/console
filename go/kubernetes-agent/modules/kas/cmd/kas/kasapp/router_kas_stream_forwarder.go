package kasapp

import (
	"io"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/reflect/protoreflect"

	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
)

const (
	tunnelReadyFieldNumber protoreflect.FieldNumber = 1
	headerFieldNumber      protoreflect.FieldNumber = 2
	messageFieldNumber     protoreflect.FieldNumber = 3
	trailerFieldNumber     protoreflect.FieldNumber = 4
	errorFieldNumber       protoreflect.FieldNumber = 5
	noTunnelFieldNumber    protoreflect.FieldNumber = 6
)

type kasStreamForwarder struct {
	log               *zap.Logger
	rpcApi            modserver.RpcApi
	gatewayKasVisitor *grpctool2.StreamVisitor
}

// ForwardStream does bi-directional stream forwarding.
// Returns a gRPC status-compatible error.
func (f *kasStreamForwarder) ForwardStream(kasStream grpc.ClientStream, stream grpc.ServerStream) error {
	// kasStream is an outbound client stream (this/routing kas -> gateway kas)
	// stream is an inbound server stream (internal/external gRPC client -> this/routing kas)
	x := grpctool2.InboundStreamToOutboundStream{
		PipeInboundToOutbound: func() error {
			return f.pipeFromStreamToKas(kasStream, stream)
		},
		PipeOutboundToInbound: func() error {
			return f.pipeFromKasToStream(kasStream, stream)
		},
	}
	return x.Pipe()
}

func (f *kasStreamForwarder) pipeFromKasToStream(kasStream grpc.ClientStream, stream grpc.ServerStream) error {
	var statusFromKasStream error
	err := f.gatewayKasVisitor.Visit(kasStream,
		grpctool2.WithStartState(tunnelReadyFieldNumber),
		grpctool2.WithCallback(headerFieldNumber, func(header *GatewayKasResponse_Header) error {
			err := stream.SetHeader(header.Metadata())
			if err != nil {
				return f.rpcApi.HandleIoError(f.log, "router kas->stream SetHeader() failed", err)
			}
			return nil
		}),
		grpctool2.WithCallback(messageFieldNumber, func(message *GatewayKasResponse_Message) error {
			err := stream.SendMsg(&grpctool2.RawFrame{
				Data: message.Data,
			})
			if err != nil {
				return f.rpcApi.HandleIoError(f.log, "router kas->stream SendMsg() failed", err)
			}
			return nil
		}),
		grpctool2.WithCallback(trailerFieldNumber, func(trailer *GatewayKasResponse_Trailer) error {
			stream.SetTrailer(trailer.Metadata())
			return nil
		}),
		grpctool2.WithCallback(errorFieldNumber, func(err *GatewayKasResponse_Error) error {
			statusFromKasStream = status.ErrorProto(err.Status)
			return nil
		}),
	)
	if err != nil {
		return err
	}
	return statusFromKasStream
}

// pipeFromStreamToKas pipes data kasStream -> stream
// must return gRPC status compatible error or nil.
func (f *kasStreamForwarder) pipeFromStreamToKas(kasStream grpc.ClientStream, stream grpc.ServerStream) error {
	for {
		var frame grpctool2.RawFrame
		err := stream.RecvMsg(&frame)
		if err != nil {
			if err == io.EOF { // nolint:errorlint
				break
			}
			return err
		}
		err = kasStream.SendMsg(&frame)
		if err != nil {
			if err == io.EOF { // nolint:errorlint
				return nil // the other goroutine will receive the error in RecvMsg()
			}
			return f.rpcApi.HandleIoError(f.log, "stream->router kas SendMsg() failed", err)
		}
	}
	err := kasStream.CloseSend()
	if err != nil {
		return f.rpcApi.HandleIoError(f.log, "stream->router kas CloseSend() failed", err)
	}
	return nil
}
