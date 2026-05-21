package scm

import (
	"context"
	"errors"
	"fmt"
	"net"
	"os"

	"google.golang.org/grpc"
	"k8s.io/klog/v2"

	consoleclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/cmd/mcpserver/agent/args"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	"github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"github.com/pluralsh/console/go/deployment-operator/pkg/scm"
)

type Server struct {
	*grpc.Server

	client   client.Client
	agentRun *consoleclient.AgentRunFragment
}

func (in *Server) init() (*Server, error) {
	agentRun, err := in.client.GetAgentRun(context.Background(), args.AgentRunID())
	if err != nil {
		return nil, fmt.Errorf("could not get agent run: %w", err)
	}

	if agentRun.ScmCreds == nil || agentRun.ScmCreds.Token == "" {
		return nil, fmt.Errorf("agent run does not have scm creds")
	}

	if err = os.Setenv(environment.EnvGitAccessToken, agentRun.ScmCreds.Token); err != nil {
		return nil, fmt.Errorf("could not set git access token: %w", err)
	}

	in.agentRun = agentRun
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

func NewServer(client client.Client) (*Server, error) {
	return (&Server{
		client: client,
	}).init()
}
