package test

import (
	"context"
)

var (
	_ TestingServer = &GrpcTestingServer{}
)

type GrpcTestingServer struct {
	UnimplementedTestingServer
	UnaryFunc     func(context.Context, *Request) (*Response, error)
	StreamingFunc func(Testing_StreamingRequestResponseServer) error
}

func (s *GrpcTestingServer) RequestResponse(ctx context.Context, request *Request) (*Response, error) {
	return s.UnaryFunc(ctx, request)
}

func (s *GrpcTestingServer) StreamingRequestResponse(server Testing_StreamingRequestResponseServer) error {
	return s.StreamingFunc(server)
}
