package scm

import (
	"errors"
	"fmt"
	"net"
	"os"

	"google.golang.org/grpc"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/cmd/mcpserver/agent/args"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"github.com/pluralsh/console/go/deployment-operator/pkg/scm"
)

type Server struct {
	*grpc.Server

	token string
}

func (in *Server) init() (*Server, error) {
	if err := os.Setenv(environment.EnvGitAccessToken, in.token); err != nil {
		return nil, fmt.Errorf("could not set git access token: %w", err)
	}

	return in, nil
}

func (in *Server) Start() (<-chan error, error) {
	in.Server = grpc.NewServer()
	scm.RegisterGRPCServer(in.Server)

	listener, err := net.Listen("tcp", args.GRPCAddress())
	if err != nil {
		return nil, fmt.Errorf("could not listen for scm grpc api: %w", err)
	}

	errChan := make(chan error, 1)

	go func() {
		defer func() { _ = listener.Close() }()
		klog.V(log.LogLevelDefault).InfoS("starting scm grpc api", "address", args.GRPCAddress())
		serveErr := in.Server.Serve(listener)

		if serveErr != nil && !errors.Is(serveErr, grpc.ErrServerStopped) {
			errChan <- serveErr
			close(errChan)
			return
		}

		errChan <- nil
		close(errChan)
	}()

	return errChan, nil
}

func (in *Server) GracefulStop() {
	in.Server.GracefulStop()
}

func (in *Server) Stop() {
	in.Server.Stop()
}

func NewServer(token string) (*Server, error) {
	if len(token) == 0 {
		return nil, errors.New("git access token is required")
	}

	return (&Server{
		token: token,
	}).init()
}
