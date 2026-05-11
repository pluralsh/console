package tool

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/pluralsh/deployment-operator/pkg/scm"
)

// GetCILogs is an MCP tool that fetches the raw log output for a single
// failed GitHub Actions job identified by its check run ID.
type GetCILogs struct {
	id          ID
	description string
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

	token := os.Getenv(envGitAccessToken)
	if token == "" {
		return mcp.NewToolResultError("GIT_ACCESS_TOKEN is not set; cannot authenticate with SCM provider"), nil
	}

	client := scm.NewClient(token)
	logs, err := client.GetCILogs(ctx, prURL, checkRunID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to fetch CI logs: %v", err)), nil
	}

	return mcp.NewToolResultText(logs), nil
}

func NewGetCILogs() Tool {
	return &GetCILogs{
		id:          GetCILogsTool,
		description: "Fetches the raw log output for a failing GitHub Actions job. Use the checkRunId from the getPRState tool. Logs are capped at 512 KB.",
	}
}
