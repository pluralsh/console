package tool

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/pluralsh/console/go/deployment-operator/pkg/scm"
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
			mcp.WithBoolean("sideload",
				mcp.Description("When true, sideloads reviewer comments and CI check status. Disable this when comments and CI details are unnecessary to reduce SCM API calls and response size. Defaults to true."),
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
	sideload := request.GetBool("sideload", true)
	details, err := prDetails(ctx, client, prURL, sideload)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to fetch PR state: %v", err)), nil
	}

	var sb strings.Builder
	_, _ = fmt.Fprintf(&sb, "# PR: %s\nURL: %s\nBranch: %s\nState: %s\n\n", details.Title, prURL, details.HeadRef, details.State)

	if !sideload {
		sb.WriteString("Comments and CI checks were not sideloaded. Call again with `sideload: true` if you need reviewer comments, CI status, or check run IDs.\n")
		return mcp.NewToolResultText(sb.String()), nil
	}

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

func prDetails(ctx context.Context, client scm.Client, prURL string, sideload bool) (*scm.PRDetails, error) {
	if sideload {
		return client.GetPRDetails(ctx, prURL)
	}
	return client.GetPRSummary(ctx, prURL)
}

func NewGetPRState() Tool {
	return &GetPRState{
		id:          GetPRStateTool,
		description: "Fetches live pull request state from the SCM provider. By default sideloads all reviewer comments and CI check statuses; set sideload=false when you only need basic PR metadata.",
	}
}
