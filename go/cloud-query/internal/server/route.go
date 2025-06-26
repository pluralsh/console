package server

import (
	"google.golang.org/grpc"
)

type Route interface {
	Install(server *grpc.Server)
}
