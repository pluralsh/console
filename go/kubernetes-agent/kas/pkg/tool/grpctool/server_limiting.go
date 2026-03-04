package grpctool

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ServerLimiter defines the interface to perform server-side request rate limiting.
// Inspired by golang.org/x/time/rate.Limiter, but accepts a context
type ServerLimiter interface {
	// Allow should return true and consume one "limitable event" if the limit has not been exceeded. Otherwise, it returns false and does not count towards the limit
	Allow(ctx context.Context) bool
}

// UnaryServerLimitingInterceptor returns a new unary server interceptor that performs limiting based on the given context
func UnaryServerLimitingInterceptor(limiter ServerLimiter) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp interface{}, err error) {
		if !limiter.Allow(ctx) {
			return nil, status.Error(codes.ResourceExhausted, "new connection rate limit exhausted for this agent, try again later")
		}
		return handler(ctx, req)
	}
}

// StreamServerLimitingInterceptor returns a new stream server interceptor that performs limiting based on the given context
func StreamServerLimitingInterceptor(limiter ServerLimiter) grpc.StreamServerInterceptor {
	return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		if !limiter.Allow(ss.Context()) {
			return status.Error(codes.ResourceExhausted, "new connection rate limit exhausted for this agent, try again later")
		}
		return handler(srv, ss)
	}
}
