package tool

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/pluralsh/deployment-operator/pkg/scm"
)

const envGitAccessToken = "GIT_ACCESS_TOKEN"

// GetPRState is an MCP tool that fetches live PR state (comments + CI checks)
// directly from the SCM provider using the GIT_ACCESS_TOKEN available to the harness.
type GetPRState struct {
	id          ID
	description string
}

func (in *GetPRState) ID() ID { return in.id }

func (in *GetPRState) Install(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool(
			in.id.String(),
			mcp.WithDescription(in.description),
			mcp.WithString("prUrl",
				mcp.Required(),
				mcp.Description("Full URL of the pull request, e.g. https://github.com/owner/repo/pull/42"),
			),
		),
		in.handler,
	)
}

func (in *GetPRState) handler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	prURL, err := request.RequireString("prUrl")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("missing prUrl: %v", err)), nil
	}

	token := os.Getenv(envGitAccessToken)
	if token == "" {
		return mcp.NewToolResultError("GIT_ACCESS_TOKEN is not set; cannot authenticate with SCM provider"), nil
	}

	client := scm.NewClient(token)
	details, err := client.GetPRDetails(ctx, prURL)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to fetch PR state: %v", err)), nil
	}

	var sb strings.Builder
	_, _ = fmt.Fprintf(&sb, "# PR: %s\nURL: %s\nBranch: %s\n\n", details.Title, prURL, details.HeadRef)

	_, _ = fmt.Fprintf(&sb, "## Comments (%d)\n\n", len(details.Comments))
	for _, c := range details.Comments {
		body := strings.ReplaceAll(c.Body, "\n", "\n  > ")
		_, _ = fmt.Fprintf(&sb, "- **%s** at %s:\n  > %s\n\n", c.Author, c.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"), body)
	}

	_, _ = fmt.Fprintf(&sb, "## CI Checks (%d)\n\n", len(details.CIChecks))
	for _, ci := range details.CIChecks {
		icon := "✅"
		switch ci.Conclusion {
		case "failure", "timed_out", "cancelled":
			icon = "❌"
		case "":
			if ci.Status != "completed" {
				icon = "⏳"
			}
		}
		_, _ = fmt.Fprintf(&sb, "- %s **%s** — status: `%s`, conclusion: `%s`, id: `%d`\n",
			icon, ci.Name, ci.Status, ci.Conclusion, ci.CheckRunID)
	}

	return mcp.NewToolResultText(sb.String()), nil
}

func NewGetPRState() Tool {
	return &GetPRState{
		id:          GetPRStateTool,
		description: "Fetches live pull request state from the SCM provider (GitHub). Returns all comments and CI check statuses. Use this to understand what reviewers have said and which CI checks are failing.",
	}
}
