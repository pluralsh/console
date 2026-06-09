package tool

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	console "github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

func (in *CreatePullRequest) Install(server *server.MCPServer) {
	server.AddTool(
		mcp.NewTool(
			in.id.String(),
			mcp.WithDescription(in.description),
			mcp.WithString("title",
				mcp.Required(),
				mcp.Description("The title of the pull request"),
			),
			mcp.WithString("body",
				mcp.Required(),
				mcp.Description("The body/description of the pull request"),
			),
			mcp.WithString("base",
				mcp.Description("The base branch to target. Defaults to the branch the agent run was cloned from."),
			),
			mcp.WithString("head",
				mcp.Required(),
				mcp.Description("The head branch (source branch with changes)"),
			),
		),
		in.handler,
	)
}

func (in *CreatePullRequest) handler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	attrs, err := in.fromRequest(request)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("could not map request to attributes: %v", err)), nil
	}

	if err := in.persistRemoteHeadBranch(ctx, attrs.Head); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to persist head branch: %v", err)), nil
	}

	pr, err := in.client.CreateAgentPullRequest(ctx, in.agentRunID, attrs)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to create pull request: %v", err)), nil
	}

	return mcp.NewToolResultJSON(struct {
		Success        bool                          `json:"success"`
		Message        string                        `json:"message"`
		PullRequestId  string                        `json:"pullRequestId"`
		PullRequestUrl string                        `json:"pullRequestUrl"`
		Status         *client.PrStatus              `json:"status"`
		Title          *string                       `json:"title"`
		Creator        *string                       `json:"creator"`
		CommitSHAs     []*client.CommitShaAttributes `json:"commitShas"`
	}{
		Success:        true,
		Message:        fmt.Sprintf("successfully created pull request from %s to %s", attrs.Head, attrs.Base),
		PullRequestId:  pr.ID,
		PullRequestUrl: pr.URL,
		Status:         pr.Status,
		Title:          pr.Title,
		Creator:        pr.Creator,
		CommitSHAs:     attrs.CommitShas,
	})
}

func (in *CreatePullRequest) persistRemoteHeadBranch(ctx context.Context, branch string) error {
	if strings.TrimSpace(branch) == "" || in.runtimeClient == nil {
		return nil
	}

	_, err := in.runtimeClient.UpdateAgentRun(ctx, in.agentRunID, client.AgentRunStatusAttributes{
		Status:     client.AgentRunStatusRunning,
		HeadBranch: &branch,
	})
	return err
}

func (in *CreatePullRequest) persistHeadBranch(branch string) error {
	if strings.TrimSpace(branch) == "" {
		return nil
	}

	config, err := environment.Load()
	if err == nil {
		config.HeadBranch = branch
		if err := config.Save(); err != nil {
			return err
		}
	}

	return nil
}

func (in *CreatePullRequest) fromRequest(request mcp.CallToolRequest) (result client.AgentPullRequestAttributes, err error) {
	if result.Title, err = request.RequireString("title"); err != nil {
		return
	}

	if result.Body, err = request.RequireString("body"); err != nil {
		return
	}

	if result.Head, err = request.RequireString("head"); err != nil {
		return
	}

	if err = in.persistHeadBranch(result.Head); err != nil {
		return
	}

	config, err := environment.Load()
	if err != nil {
		return
	}

	result.Base = strings.TrimSpace(request.GetString("base", config.BaseBranch))
	if result.Base == "" {
		result.Base = config.BaseBranch
	}

	headSHA, err := in.getCommitSHA(config.Dir, result.Head)
	if err != nil {
		return result, fmt.Errorf("failed to get HEAD commit SHA: %w", err)
	}
	result.CommitShas = append(result.CommitShas, &client.CommitShaAttributes{
		Branch: result.Head,
		Sha:    headSHA,
	})

	baseSHA, err := in.getCommitSHA(config.Dir, result.Base)
	if err != nil {
		return result, fmt.Errorf("failed to get base branch commit SHA: %w", err)
	}
	result.CommitShas = append(result.CommitShas, &client.CommitShaAttributes{
		Branch: result.Base,
		Sha:    baseSHA,
	})

	return
}

// getCommitSHA retrieves the commit SHA for a given branch
func (in *CreatePullRequest) getCommitSHA(repoDir, branch string) (string, error) {
	shaBytes, err := exec.NewExecutable("git",
		exec.WithArgs([]string{"rev-parse", branch}),
		exec.WithDir(repoDir)).RunWithOutput(context.Background())
	if err != nil {
		shaBytes, err = exec.NewExecutable("git",
			exec.WithArgs([]string{"rev-parse", "origin/" + branch}),
			exec.WithDir(repoDir)).RunWithOutput(context.Background())
		if err != nil {
			return "", err
		}
	}

	return string(bytes.TrimSpace(shaBytes)), nil
}

func NewCreatePullRequest(client, runtimeClient console.Client, agentRunID string) Tool {
	return &CreatePullRequest{
		ConsoleTool: ConsoleTool{
			id:            CreatePullRequestTool,
			description:   "Create a pull request through the Plural console GraphQL API for agent-generated changes",
			client:        client,
			runtimeClient: runtimeClient,
			agentRunID:    agentRunID,
		},
	}
}
