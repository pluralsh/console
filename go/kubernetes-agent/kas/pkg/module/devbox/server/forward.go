package server

import (
	"context"
	"errors"
	"io"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"

	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/devbox"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/grpctool"
)

// rawStreamDesc is used for every forwarded call: all methods are proxied as raw bidi streams, which also
// covers unary and server-streaming methods.
var rawStreamDesc = grpc.StreamDesc{
	ServerStreams: true,
	ClientStreams: true,
}

// mungeServiceDesc returns a copy of desc where every method is a bidi stream handled by handler, so calls
// can be forwarded as raw frames without knowing message types.
func mungeServiceDesc(desc *grpc.ServiceDesc, handler grpc.StreamHandler) *grpc.ServiceDesc {
	munged := &grpc.ServiceDesc{
		ServiceName: desc.ServiceName,
		HandlerType: (*any)(nil),
		Metadata:    desc.Metadata,
	}
	for _, m := range desc.Methods {
		munged.Streams = append(munged.Streams, grpc.StreamDesc{
			StreamName:    m.MethodName,
			Handler:       handler,
			ServerStreams: true,
			ClientStreams: true,
		})
	}
	for _, s := range desc.Streams {
		munged.Streams = append(munged.Streams, grpc.StreamDesc{
			StreamName:    s.StreamName,
			Handler:       handler,
			ServerStreams: true,
			ClientStreams: true,
		})
	}
	return munged
}

// outgoingMetadata copies incoming metadata for forwarding, dropping credentials and KAS routing keys.
func outgoingMetadata(ctx context.Context) metadata.MD {
	md, _ := metadata.FromIncomingContext(ctx)
	md = devbox.StripCredentials(md)
	for k := range md {
		if strings.HasPrefix(k, modserver.RoutingHopPrefix) {
			delete(md, k)
		}
	}
	return md
}

// forwardStream opens fullMethod on conn and pipes raw frames, headers and trailers between it and inbound.
// The returned error is the outbound call's status (or a transport error), passed through unchanged.
func forwardStream(ctx context.Context, inbound grpc.ServerStream, conn grpc.ClientConnInterface, fullMethod string) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	outbound, err := conn.NewStream(ctx, &rawStreamDesc, fullMethod, grpc.ForceCodec(grpctool.RawCodec{}))
	if err != nil {
		return err
	}
	go func() {
		if err := pipeInbound(inbound, outbound); err != nil {
			cancel() // the caller went away or sent garbage; abort the outbound call
		}
	}()
	header, err := outbound.Header()
	if err == nil && len(header) > 0 {
		if err = inbound.SetHeader(header); err != nil {
			return err
		}
	}
	for {
		var frame grpctool.RawFrame
		err = outbound.RecvMsg(&frame)
		if err != nil {
			break
		}
		if err = inbound.SendMsg(&frame); err != nil {
			return err
		}
	}
	inbound.SetTrailer(outbound.Trailer())
	if errors.Is(err, io.EOF) {
		// The callee finished the call; don't wait for the caller to half-close.
		return nil
	}
	return err
}

func pipeInbound(inbound grpc.ServerStream, outbound grpc.ClientStream) error {
	for {
		var frame grpctool.RawFrame
		err := inbound.RecvMsg(&frame)
		if err != nil {
			if errors.Is(err, io.EOF) {
				return outbound.CloseSend()
			}
			return err
		}
		if err = outbound.SendMsg(&frame); err != nil {
			if errors.Is(err, io.EOF) {
				// Outbound stream is done; RecvMsg on it returns the real status.
				return nil
			}
			return err
		}
	}
}
