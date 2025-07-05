package service

import (
	"google.golang.org/grpc"
)

// Service defines the interface that allows for the installation of services into a gRPC server.
type Service interface {
	Install(server *grpc.Server)
}
