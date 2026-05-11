package tool

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	console "github.com/pluralsh/deployment-operator/pkg/client"
)

func (in *FetchTodos) Install(server *server.MCPServer) {
	server.AddTool(
		mcp.NewTool(
			in.id.String(),
			mcp.WithDescription(in.description),
		),
		in.handler,
	)
}

func (in *FetchTodos) handler(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	// if todos are not cached, fetch them from the server
	if !HasCachedTodos() {
		todos, err := in.client.GetAgentRunTodos(ctx, in.agentRunID)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to get agent run todos: %v", err)), nil
		}

		if len(todos) > 0 {
			UpdateCachedTodos(todos)
		}
	}

	// we need to convert the todos to return the correct format for the MCP server
	todos := make([]map[string]interface{}, 0)
	if HasCachedTodos() {
		for _, todo := range GetCachedTodos() {
			todoMap := map[string]interface{}{
				"title":       todo.Title,
				"done":        todo.Done,
				"description": todo.Description,
			}
			todos = append(todos, todoMap)
		}
	}

	return mcp.NewToolResultJSON(struct {
		Success bool                     `json:"success"`
		Message string                   `json:"message"`
		Todos   []map[string]interface{} `json:"todos"`
	}{
		Success: true,
		Message: fmt.Sprintf("successfully fetched todos for agent run %s", in.agentRunID),
		Todos:   todos,
	})
}

func NewFetchTodos(client console.Client, agentRunID string) Tool {
	return &FetchTodos{
		ConsoleTool: ConsoleTool{
			id:          FetchTodosTool,
			description: "Fetches the todos for the current agent run",
			client:      client,
			agentRunID:  agentRunID,
		},
	}
}
