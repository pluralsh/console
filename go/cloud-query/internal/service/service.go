package service

import (
	"context"

	"google.golang.org/grpc"
)

// Service defines the interface that allows for the installation of services into a gRPC server.
type Service interface {
	Install(server *grpc.Server)
}

// Closer is implemented by services that own background processes or other
// resources which must be released during server shutdown.
type Closer interface {
	Close(context.Context) error
}
