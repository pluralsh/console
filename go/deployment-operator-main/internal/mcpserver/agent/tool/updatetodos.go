package tool

import (
	"context"
	"fmt"
	"strconv"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/pluralsh/console/go/client"
	"github.com/samber/lo"

	console "github.com/pluralsh/deployment-operator/pkg/client"
)

func (in *UpdateTodos) Install(server *server.MCPServer) {
	server.AddTool(
		mcp.NewTool(
			in.id.String(),
			mcp.WithDescription(in.description),
			mcp.WithInputSchema[UpdateTodosInputSchema](),
		),
		in.handler,
	)
}

func (in *UpdateTodos) handler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	attrs, err := in.fromRequest(request)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("could not map request to attributes: %v", err)), nil
	}

	if HasCachedTodos() {
		if len(GetCachedTodos()) != len(attrs) {
			return mcp.NewToolResultError("cached todos length do not match request todos"), nil
		}

		if !EqualsCachedTodos(attrs) {
			return mcp.NewToolResultError("cached todos order or titles do not match request todos"), nil
		}
	}

	agentRun, err := in.client.UpdateAgentRunTodos(ctx, in.agentRunID, attrs)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to update todos: %v", err)), nil
	}

	if !HasCachedTodos() {
		UpdateCachedTodos(agentRun.Todos)
	} else {
		MarkCachedTodoItems(agentRun.Todos)
	}

	return mcp.NewToolResultJSON(struct {
		Success bool                        `json:"success"`
		Message string                      `json:"message"`
		Done    []*client.AgentTodoFragment `json:"done"`
		Todo    []*client.AgentTodoFragment `json:"todo"`
	}{
		Success: true,
		Message: fmt.Sprintf("successfully updated todos for agent run %s", agentRun.ID),
		Done: lo.Filter(agentRun.Todos, func(item *client.AgentTodoFragment, index int) bool {
			return item != nil && item.Done != nil && *item.Done
		}),
		Todo: lo.Filter(agentRun.Todos, func(item *client.AgentTodoFragment, index int) bool {
			return item != nil && item.Done != nil && !*item.Done
		}),
	})
}

func (in *UpdateTodos) fromRequest(request mcp.CallToolRequest) ([]*client.AgentTodoAttributes, error) {
	raw, ok := request.GetArguments()["todos"]
	if !ok {
		return nil, fmt.Errorf("missing todos argument")
	}

	items, ok := raw.([]any)
	if !ok {
		return nil, fmt.Errorf("todos argument is not a list: %v", raw)
	}

	todos := make([]*client.AgentTodoAttributes, 0, len(items))
	for i, item := range items {
		m, ok := item.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("todos[%d] must be an object, got %T", i, item)
		}

		title := fmt.Sprint(m["title"])
		description := fmt.Sprint(m["description"])
		done := in.toBool(m["done"])

		todos = append(todos, &client.AgentTodoAttributes{
			Title:       title,
			Description: description,
			Done:        done,
		})
	}

	return todos, nil
}

func (in *UpdateTodos) toBool(v any) bool {
	switch x := v.(type) {
	case bool:
		return x
	case string:
		b, _ := strconv.ParseBool(x)
		return b
	default:
		return false
	}
}

func NewUpdateTodos(client console.Client, agentRunID string) Tool {
	return &UpdateTodos{
		ConsoleTool: ConsoleTool{
			id:          UpdateTodosTool,
			description: "Updates the todo checklist progress in the system to keep track of what needs to be done for a given agent run",
			client:      client,
			agentRunID:  agentRunID,
		},
	}
}
