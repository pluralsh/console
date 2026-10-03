package tool

import (
	"context"
	"fmt"
	"strconv"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// GetCILogs is an MCP tool that fetches the raw log output for a single
// failed GitHub Actions job identified by its check run ID.
type GetCILogs struct {
	id          ID
	description string
	client      SCMClientProvider
}

func (in *GetCILogs) ID() ID { return in.id }

func (in *GetCILogs) Install(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool(
			in.id.String(),
			mcp.WithDescription(in.description),
			mcp.WithString("prUrl",
				mcp.Required(),
				mcp.Description("Full URL of the pull request, e.g. https://github.com/owner/repo/pull/42"),
			),
			mcp.WithString("checkRunId",
				mcp.Required(),
				mcp.Description("Numeric check run ID from the getPRState tool (the `id` field next to each CI check)"),
			),
		),
		in.handler,
	)
}

func (in *GetCILogs) handler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	prURL, err := request.RequireString("prUrl")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("missing prUrl: %v", err)), nil
	}

	checkRunIDStr, err := request.RequireString("checkRunId")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("missing checkRunId: %v", err)), nil
	}

	checkRunID, err := strconv.ParseInt(checkRunIDStr, 10, 64)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("invalid checkRunId %q: must be a numeric ID from getPRState", checkRunIDStr)), nil
	}

	client := in.client()
	logs, err := client.GetCILogs(ctx, prURL, checkRunID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to fetch CI logs: %v", err)), nil
	}

	return mcp.NewToolResultText(logs), nil
}

func NewGetCILogs(client SCMClientProvider) Tool {
	return &GetCILogs{
		id:          GetCILogsTool,
		description: "Fetches the raw log output for a failing CI job. Use the checkRunId from getPRState. Inspect logs to distinguish real PR defects from CI flakes (transient network/registry errors, third-party outages, runner issues); do not push a fix for flakes. Logs are capped at 512 KB.",
		client:      client,
	}
}
