package main

import (
	"flag"

	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/cmd/mcpserver/agent/args"
	"github.com/pluralsh/deployment-operator/internal/mcpserver/agent"
	"github.com/pluralsh/deployment-operator/internal/mcpserver/agent/tool"
	console "github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/log"
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

	client := console.New(args.ConsoleURL(), args.ConsoleToken())
	server := agent.NewServer(
		client,
		createServerOptions(client)...,
	)

	if err := server.Start(); err != nil {
		klog.Fatalf("Plural Console MCP server error: %v, exiting", err)
	}
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
	}

	for _, excluded := range excludedTools {
		delete(toolMap, excluded)
	}

	return lo.Map(lo.Values(toolMap), func(t tool.Tool, _ int) agent.Option {
		return agent.WithTool(t)
	})
}
