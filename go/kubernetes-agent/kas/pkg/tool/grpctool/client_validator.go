package grpctool

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// UnaryClientValidatingInterceptor is a unary client interceptor that performs response validation.
func UnaryClientValidatingInterceptor(parentCtx context.Context, method string, req, reply interface{}, cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
	err := invoker(parentCtx, method, req, reply, cc, opts...)
	if err != nil {
		return err
	}
	return maybeValidate(reply)
}

// StreamClientValidatingInterceptor is a stream client interceptor that performs response stream validation.
func StreamClientValidatingInterceptor(parentCtx context.Context, desc *grpc.StreamDesc, cc *grpc.ClientConn, method string, streamer grpc.Streamer, opts ...grpc.CallOption) (grpc.ClientStream, error) {
	stream, err := streamer(parentCtx, desc, cc, method, opts...)
	if err != nil {
		return nil, err
	}
	return recvWrapper{
		ClientStream: stream,
	}, nil
}

type validatable interface {
	ValidateAll() error
}

type recvWrapper struct {
	grpc.ClientStream
}

func (w recvWrapper) RecvMsg(m interface{}) error {
	if err := w.ClientStream.RecvMsg(m); err != nil {
		return err
	}
	return maybeValidate(m)
}

func maybeValidate(msg interface{}) error {
	if v, ok := msg.(validatable); ok {
		if err := v.ValidateAll(); err != nil {
			return status.Errorf(codes.InvalidArgument, "invalid server response: %v", err)
		}
	}
	return nil
}
