package tool

import (
	"bytes"
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	gqlclient "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	console "github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

func (in *CreateBranch) Install(server *server.MCPServer) {
	server.AddTool(
		mcp.NewTool(
			in.id.String(),
			mcp.WithDescription(in.description),
			mcp.WithString("branchName",
				mcp.Required(),
				mcp.Description("The id of the branch to create"),
			),
			mcp.WithString("commitMessage",
				mcp.Required(),
				mcp.Description("The body/description of the pull request"),
			),
		),
		in.handler,
	)
}

func (in *CreateBranch) handler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	if err := in.fromRequest(request); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("could not handle create branch request: %v", err)), nil
	}

	config, err := environment.Load()
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("could not load environment: %v", err)), nil
	}

	repoDir := config.Dir
	if err := environment.ConfigureGitSafeDirectory(repoDir); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to configure git repository: %v", err)), nil
	}

	currentBranch, _ := exec.NewExecutable("git", exec.WithArgs([]string{"branch", "--show-current"}), exec.WithDir(repoDir)).RunWithOutput(ctx)

	if string(bytes.TrimSpace(currentBranch)) != in.BranchName {
		cmd := exec.NewExecutable("git", exec.WithArgs([]string{"checkout", "-b", in.BranchName}), exec.WithDir(repoDir))
		if out, err := cmd.RunWithOutput(ctx); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to checkout branch: %v: %s", err, out)), nil
		}
	}

	cmd := exec.NewExecutable("git", exec.WithArgs([]string{"add", "."}), exec.WithDir(repoDir))
	if out, err := cmd.RunWithOutput(ctx); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to add changes: %v: %s", err, out)), nil
	}

	cmd = exec.NewExecutable("git", exec.WithArgs([]string{"commit", "-m", in.CommitMessage}), exec.WithDir(repoDir))
	if out, err := cmd.RunWithOutput(ctx); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to commit changes: %v: %s (verify you are working in the correct directory and have no uncommitted changes, the repository is cloned at %s)", err, out, repoDir)), nil
	}

	cmd = exec.NewExecutable("git", exec.WithArgs([]string{"push", "--set-upstream", "origin", in.BranchName}), exec.WithDir(repoDir))
	if out, err := cmd.RunWithOutput(ctx); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to push changes: %v: %s", err, out)), nil
	}

	config.HeadBranch = in.BranchName
	if err := config.Save(); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to persist head branch locally: %v", err)), nil
	}

	if in.runtimeClient != nil {
		if _, err := in.runtimeClient.UpdateAgentRun(ctx, in.agentRunID, gqlclient.AgentRunStatusAttributes{
			Status:     gqlclient.AgentRunStatusRunning,
			HeadBranch: &in.BranchName,
		}); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to persist head branch: %v", err)), nil
		}
	}

	return mcp.NewToolResultJSON(struct {
		Success       bool   `json:"success"`
		CommitMessage string `json:"message"`
		BranchName    string `json:"branchName"`
	}{
		Success:       true,
		CommitMessage: in.CommitMessage,
		BranchName:    in.BranchName,
	})
}

func (in *CreateBranch) fromRequest(request mcp.CallToolRequest) (err error) {
	if in.BranchName, err = request.RequireString("branchName"); err != nil {
		return
	}

	if in.CommitMessage, err = request.RequireString("commitMessage"); err != nil {
		return
	}

	return
}

func NewCreateBranch(client, runtimeClient console.Client, agentRunID string) Tool {
	return &CreateBranch{
		ConsoleTool: ConsoleTool{
			id:            CreateBranchTool,
			description:   "Creates a new branch and commits current changes to it. This should always be used before creating a pull request",
			client:        client,
			runtimeClient: runtimeClient,
			agentRunID:    agentRunID,
		},
	}
}
