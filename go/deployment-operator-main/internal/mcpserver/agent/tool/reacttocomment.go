package tool

import (
	"context"
	"fmt"
	"os"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/pluralsh/deployment-operator/pkg/scm"
)

// ReactToComment is an MCP tool that adds an emoji reaction to a PR comment.
// The agent calls it with state "working" when it starts addressing a
// comment, and "complete" when it has finished.
type ReactToComment struct {
	id          ID
	description string
}

func (in *ReactToComment) ID() ID { return in.id }

func (in *ReactToComment) Install(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool(
			in.id.String(),
			mcp.WithDescription(in.description),
			mcp.WithString("prUrl",
				mcp.Required(),
				mcp.Description("Full URL of the pull request, e.g. https://github.com/owner/repo/pull/42"),
			),
			mcp.WithString("commentId",
				mcp.Required(),
				mcp.Description("The reactable comment ID from getPRState, in format 'issue:123456' or 'review:789012'"),
			),
			mcp.WithString("state",
				mcp.Required(),
				mcp.Description("'working' to add 👀 (agent is handling this comment) or 'complete' to add 👍 (agent finished)"),
			),
		),
		in.handler,
	)
}

func (in *ReactToComment) handler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	prURL, err := request.RequireString("prUrl")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("missing prUrl: %v", err)), nil
	}

	commentID, err := request.RequireString("commentId")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("missing commentId: %v", err)), nil
	}

	stateStr, err := request.RequireString("state")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("missing state: %v", err)), nil
	}

	var state scm.CommentReactState
	switch stateStr {
	case "working":
		state = scm.CommentReactStateWorking
	case "complete":
		state = scm.CommentReactStateComplete
	default:
		return mcp.NewToolResultError(fmt.Sprintf("invalid state %q: must be 'working' or 'complete'", stateStr)), nil
	}

	token := os.Getenv(envGitAccessToken)
	if token == "" {
		return mcp.NewToolResultError("GIT_ACCESS_TOKEN is not set; cannot authenticate with SCM provider"), nil
	}

	client := scm.NewClient(token)
	if err := client.ReactToComment(ctx, prURL, commentID, state); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to add reaction: %v", err)), nil
	}

	emoji := "👀"
	if state == scm.CommentReactStateComplete {
		emoji = "👍"
	}

	return mcp.NewToolResultText(fmt.Sprintf("Reacted with %s to comment %s", emoji, commentID)), nil
}

func NewReactToComment() Tool {
	return &ReactToComment{
		id: ReactToCommentTool,
		description: "Adds an emoji reaction to a pull request comment. " +
			"Call with state='working' as soon as you start addressing a comment, " +
			"and state='complete' when you have finished. " +
			"Use the commentId from the getPRState tool.",
	}
}
