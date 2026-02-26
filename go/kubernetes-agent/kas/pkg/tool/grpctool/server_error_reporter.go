package grpctool

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ServerErrorReporter interface {
	Report(ctx context.Context, fullMethod string, err error)
}

func UnaryServerErrorReporterInterceptor(errorReporter ServerErrorReporter) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		resp, err := handler(ctx, req)
		grpcStatusCode := status.Code(err)
		if grpcStatusCode == codes.Unknown {
			errorReporter.Report(ctx, info.FullMethod, err)
		}
		return resp, err
	}
}

func StreamServerErrorReporterInterceptor(errorReporter ServerErrorReporter) grpc.StreamServerInterceptor {
	return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		err := handler(srv, ss)
		grpcStatusCode := status.Code(err)
		if grpcStatusCode == codes.Unknown {
			errorReporter.Report(ss.Context(), info.FullMethod, err)
		}
		return err
	}
}
