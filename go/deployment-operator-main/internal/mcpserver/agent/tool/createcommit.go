package tool

import (
	"bytes"
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/pluralsh/deployment-operator/pkg/agentrun-harness/environment"
	console "github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
)

// CreateCommit is an MCP tool that stages all changes, commits them with the
// provided message, and pushes to the current branch.
type CreateCommit struct {
	ConsoleTool
	CommitMessage string
}

func (in *CreateCommit) Install(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool(
			in.id.String(),
			mcp.WithDescription(in.description),
			mcp.WithString("commitMessage",
				mcp.Required(),
				mcp.Description("Short summary of what this commit addresses"),
			),
		),
		in.handler,
	)
}

func (in *CreateCommit) handler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	var err error
	if in.CommitMessage, err = request.RequireString("commitMessage"); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("missing commitMessage: %v", err)), nil
	}

	config, err := environment.Load()
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("could not load environment: %v", err)), nil
	}

	repoDir := config.Dir

	// Detect current branch for the response.
	branchOut, _ := exec.NewExecutable("git",
		exec.WithArgs([]string{"branch", "--show-current"}),
		exec.WithDir(repoDir),
	).RunWithOutput(ctx)
	branch := string(bytes.TrimSpace(branchOut))

	// Stage everything.
	if out, err := exec.NewExecutable("git",
		exec.WithArgs([]string{"add", "."}),
		exec.WithDir(repoDir),
	).RunWithOutput(ctx); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to stage changes: %v: %s", err, out)), nil
	}

	// Check whether there is anything to commit.
	statusOut, _ := exec.NewExecutable("git",
		exec.WithArgs([]string{"status", "--porcelain"}),
		exec.WithDir(repoDir),
	).RunWithOutput(ctx)
	if len(bytes.TrimSpace(statusOut)) == 0 {
		return mcp.NewToolResultJSON(struct {
			Skipped bool   `json:"skipped"`
			Reason  string `json:"reason"`
			Branch  string `json:"branch"`
		}{
			Skipped: true,
			Reason:  "nothing to commit — working tree is clean",
			Branch:  branch,
		})
	}

	// Commit.
	if out, err := exec.NewExecutable("git",
		exec.WithArgs([]string{"commit", "-m", in.CommitMessage}),
		exec.WithDir(repoDir),
	).RunWithOutput(ctx); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to commit: %v: %s", err, out)), nil
	}

	// Push to the existing remote branch.
	if out, err := exec.NewExecutable("git",
		exec.WithArgs([]string{"push", "--set-upstream", "origin", branch}),
		exec.WithDir(repoDir),
	).RunWithOutput(ctx); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to push: %v: %s", err, out)), nil
	}

	return mcp.NewToolResultJSON(struct {
		Success       bool   `json:"success"`
		CommitMessage string `json:"commitMessage"`
		Branch        string `json:"branch"`
	}{
		Success:       true,
		CommitMessage: in.CommitMessage,
		Branch:        branch,
	})
}

func NewCreateCommit(client console.Client, agentRunID string) Tool {
	return &CreateCommit{
		ConsoleTool: ConsoleTool{
			id: CreateCommitTool,
			description: "Stages all changes, commits them with the provided message, and pushes to the CURRENT branch. " +
				"Does NOT create or switch branches, use this in babysit mode where the PR branch is already checked out. " +
				"Returns an error if there is nothing to commit.",
			client:     client,
			agentRunID: agentRunID,
		},
	}
}
