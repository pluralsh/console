package client

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	internalerror "github.com/pluralsh/deployment-operator/internal/errors"
)

func (c *client) IsAgentRunExists(ctx context.Context, id string) (bool, error) {
	scm, err := c.GetAgentRun(ctx, id)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return scm != nil, nil
}

func (c *client) GetAgentRun(ctx context.Context, id string) (*console.AgentRunFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.GetAgentRun(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.AgentRun == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}

	return response.AgentRun, err
}

func (c *client) CancelAgentRun(ctx context.Context, id string) error {
	_, err := c.consoleClient.CancelAgentRun(ctx, id)
	return err
}

func (c *client) CreateAgentRun(ctx context.Context, runtimeID string, attrs console.AgentRunAttributes) (*console.AgentRunFragment, error) {
	response, err := c.consoleClient.CreateAgentRun(ctx, runtimeID, attrs)
	if err != nil {
		return nil, err
	}
	return response.CreateAgentRun, nil
}

func (c *client) UpdateAgentRun(ctx context.Context, id string, attrs console.AgentRunStatusAttributes) (*console.AgentRunFragment, error) {
	response, err := c.consoleClient.UpdateAgentRun(ctx, id, attrs)
	if err != nil {
		return nil, err
	}
	return response.UpdateAgentRun, nil
}

func (c *client) UpdateAgentRunAnalysis(ctx context.Context, runtimeID string, attrs console.AgentAnalysisAttributes) (*console.AgentRunBaseFragment, error) {
	response, err := c.consoleClient.UpdateAgentRunAnalysis(ctx, runtimeID, attrs)
	if err != nil {
		return nil, err
	}
	return response.UpdateAgentRunAnalysis, nil
}

func (c *client) UpdateAgentRunTodos(ctx context.Context, id string, attrs []*console.AgentTodoAttributes) (*console.AgentRunBaseFragment, error) {
	response, err := c.consoleClient.UpdateAgentRunTodos(ctx, id, attrs)
	if err != nil {
		return nil, err
	}
	return response.UpdateAgentRunTodos, nil
}

func (c *client) CreateAgentPullRequest(ctx context.Context, runID string, attrs console.AgentPullRequestAttributes) (*console.PullRequestFragment, error) {
	response, err := c.consoleClient.CreateAgentPullRequest(ctx, runID, attrs)
	if err != nil {
		return nil, err
	}

	if response == nil || response.AgentPullRequest == nil {
		return nil, nil
	}

	return response.AgentPullRequest, nil
}

func (c *client) CreateAgentMessage(ctx context.Context, runID string, attrs console.AgentMessageAttributes) (*console.CreateAgentMessage_CreateAgentMessage, error) {
	response, err := c.consoleClient.CreateAgentMessage(ctx, runID, attrs)
	if err != nil {
		return nil, err
	}

	if response == nil || response.CreateAgentMessage == nil {
		return nil, nil
	}

	return response.CreateAgentMessage, nil
}

func (c *client) GetAgentRunTodos(ctx context.Context, id string) ([]*console.AgentTodoFragment, error) {
	response, err := c.consoleClient.GetAgentRunTodos(ctx, id)
	if err != nil {
		return nil, err
	}

	if response == nil || response.AgentRun == nil || response.AgentRun.Todos == nil {
		return nil, nil
	}

	return response.AgentRun.Todos, nil
}
