package tool

import (
	"fmt"

	"github.com/mark3labs/mcp-go/server"
	"github.com/pluralsh/console/go/client"

	console "github.com/pluralsh/deployment-operator/pkg/client"
)

type ID string

func (tn ID) String() string {
	return string(tn)
}

func ToID(id string) (ID, error) {
	switch id {
	case string(CreateBranchTool):
		return CreateBranchTool, nil
	case string(CreatePullRequestTool):
		return CreatePullRequestTool, nil
	case string(FetchTodosTool):
		return FetchTodosTool, nil
	case string(UpdateAnalysisTool):
		return UpdateAnalysisTool, nil
	case string(UpdateTodosTool):
		return UpdateTodosTool, nil
	case string(GetPRStateTool):
		return GetPRStateTool, nil
	case string(GetCILogsTool):
		return GetCILogsTool, nil
	case string(CreateCommitTool):
		return CreateCommitTool, nil
	case string(ReactToCommentTool):
		return ReactToCommentTool, nil
	}

	return "", fmt.Errorf("invalid tool ID: %s", id)
}

const (
	CreateBranchTool      ID = "createBranch"
	CreateCommitTool      ID = "createCommit"
	CreatePullRequestTool ID = "agentPullRequest"
	FetchTodosTool        ID = "fetchAgentRunTodos"
	UpdateAnalysisTool    ID = "updateAgentRunAnalysis"
	UpdateTodosTool       ID = "updateAgentRunTodos"
	GetPRStateTool        ID = "getPRState"
	GetCILogsTool         ID = "getCILogs"
	ReactToCommentTool    ID = "reactToComment"
)

// Tool is an MCP tool that can be installed on the MCP server
type Tool interface {
	ID() ID
	Install(server *server.MCPServer)
}

type ConsoleTool struct {
	// id is the ID of the tool to register
	id ID

	// description is the description of the tool
	description string

	// client is the Plural Console client
	client console.Client

	// agentRunID is the ID of the agent run that is being processed
	agentRunID string
}

func (t *ConsoleTool) ID() ID {
	return t.id
}

// CreatePullRequest is an MCP tool that creates a pull request for a given agent run
type CreatePullRequest struct {
	ConsoleTool
}

// UpdateTodos is an MCP tool that updates the todos for a given agent run
type UpdateTodos struct {
	ConsoleTool
}

// UpdateTodosInputSchema is the input schema for the UpdateTodos tool
type UpdateTodosInputSchema struct {
	Todos []client.AgentTodoAttributes `json:"todos"`
}

// UpdateAnalysis is an MCP tool that updates the analysis for a given agent run
type UpdateAnalysis struct {
	ConsoleTool
}

type CreateBranch struct {
	ConsoleTool
	CommitMessage string
	BranchName    string
}

// FetchTodos is an MCP tool that gets the todos for a given agent run
type FetchTodos struct {
	ConsoleTool
}
