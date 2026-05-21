package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os/signal"
	"syscall"
	"time"

	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/cmd/mcpserver/agent/args"
	"github.com/pluralsh/console/go/deployment-operator/internal/mcpserver/agent"
	"github.com/pluralsh/console/go/deployment-operator/internal/mcpserver/agent/scm"
	"github.com/pluralsh/console/go/deployment-operator/internal/mcpserver/agent/tool"
	console "github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const (
	dev = "0.0.0"
)

// Version of this binary
var Version = dev

func init() {
	defaultFlagSet := flag.CommandLine

	// Init klog
	klog.InitFlags(defaultFlagSet)
}

func main() {
	klog.V(log.LogLevelDefault).InfoS("starting plural mcp server", "version", Version)

	if err := run(); err != nil {
		klog.Fatalf("plural mcp server exited with error: %v", err)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	extClient := console.New(args.ConsoleExtApiURL(), args.DeployToken())
	scmToken, consoleToken, err := getCredentials(ctx, extClient)
	if err != nil {
		return fmt.Errorf("could not get credentials: %w", err)
	}

	client := console.New(args.ConsoleApiURL(), consoleToken)
	mcpServer := agent.NewServer(
		client,
		createServerOptions(client)...,
	)

	grpcServer, err := scm.NewServer(scmToken)
	if err != nil {
		return fmt.Errorf("could not create grpc server: %w", err)
	}

	mcpErrChan := startMcpServer(mcpServer)
	scmErrChan, err := grpcServer.Start()
	if err != nil {
		return fmt.Errorf("could not start scm grpc server: %w", err)
	}

	var serveErr error
	select {
	case <-ctx.Done():
		klog.V(log.LogLevelDefault).InfoS("shutdown signal received")
	case err = <-mcpErrChan:
		if err != nil {
			serveErr = fmt.Errorf("mcp server failed: %w", err)
		} else {
			klog.V(log.LogLevelDefault).InfoS("mcp server stopped")
		}
	case err = <-scmErrChan:
		if err != nil {
			serveErr = fmt.Errorf("scm grpc server failed: %w", err)
		} else {
			klog.V(log.LogLevelDefault).InfoS("scm grpc server stopped")
		}
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	shutdownErr := shutdownServers(shutdownCtx, grpcServer, mcpServer)
	if serveErr != nil {
		if shutdownErr != nil {
			return fmt.Errorf("%v; shutdown error: %w", serveErr, shutdownErr)
		}
		return serveErr
	}

	if shutdownErr != nil {
		return shutdownErr
	}

	return nil
}

func getCredentials(ctx context.Context, client console.Client) (scmToken, consoleToken string, err error) {
	agentRun, err := client.GetAgentRun(ctx, args.AgentRunID())
	if err != nil {
		return "", "", fmt.Errorf("could not get agent run: %w", err)
	}

	if agentRun.ScmCreds == nil || agentRun.ScmCreds.Token == "" {
		return "", "", fmt.Errorf("agent run does not have scm creds")
	}

	if agentRun.PluralCreds == nil || agentRun.PluralCreds.Token == nil {
		return "", "", fmt.Errorf("agent run does not have plural creds")
	}

	return agentRun.ScmCreds.Token, *agentRun.PluralCreds.Token, nil
}

func shutdownServers(ctx context.Context, grpcServer *scm.Server, mcpServer *agent.Server) error {
	grpcDone := make(chan struct{})
	go func() {
		grpcServer.GracefulStop()
		close(grpcDone)
	}()

	select {
	case <-grpcDone:
	case <-ctx.Done():
		grpcServer.Stop()
	}

	if err := mcpServer.Shutdown(ctx); err != nil && !errors.Is(err, context.Canceled) {
		return fmt.Errorf("mcp server shutdown failed: %w", err)
	}

	return nil
}

func startMcpServer(server *agent.Server) <-chan error {
	errChan := make(chan error, 1)

	go func() {
		errChan <- server.Start(args.Address())
		close(errChan)
	}()

	return errChan
}

func createServerOptions(client console.Client) []agent.Option {
	return append(
		[]agent.Option{
			agent.WithTools(),
			agent.WithVersion(Version),
		},
		createServerTools(client)...,
	)
}

func createServerTools(client console.Client) []agent.Option {
	excludedTools, err := args.ExcludeTools()
	if err != nil {
		klog.Fatalf("could not parse excluded tools: %v", err)
	}

	toolMap := map[tool.ID]tool.Tool{
		tool.CreateBranchTool:      tool.NewCreateBranch(client, args.AgentRunID()),
		tool.CreateCommitTool:      tool.NewCreateCommit(client, args.AgentRunID()),
		tool.CreatePullRequestTool: tool.NewCreatePullRequest(client, args.AgentRunID()),
		tool.FetchTodosTool:        tool.NewFetchTodos(client, args.AgentRunID()),
		tool.UpdateAnalysisTool:    tool.NewUpdateAnalysis(client, args.AgentRunID()),
		tool.UpdateTodosTool:       tool.NewUpdateTodos(client, args.AgentRunID()),
		tool.GetPRStateTool:        tool.NewGetPRState(),
		tool.GetCILogsTool:         tool.NewGetCILogs(),
		tool.ReactToCommentTool:    tool.NewReactToComment(),
		tool.DownloadManifestsTool: tool.NewDownloadManifests(client),
	}

	for _, excluded := range excludedTools {
		delete(toolMap, excluded)
	}

	return lo.Map(lo.Values(toolMap), func(t tool.Tool, _ int) agent.Option {
		return agent.WithTool(t)
	})
}
