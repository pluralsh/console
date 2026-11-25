package client

import (
	"context"
	"encoding/json"
	stderrors "errors"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/deployment-operator/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) IsAgentRuntimeExists(ctx context.Context, name, clusterID string) (bool, error) {
	scm, err := c.GetAgentRuntimeByName(ctx, name, clusterID)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return scm != nil, nil
}

func (c *client) GetAgentRuntime(ctx context.Context, id string) (*console.AgentRuntimeFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.GetAgentRuntime(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.AgentRuntime == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}

	return response.AgentRuntime, err
}

func (c *client) GetAgentRuntimeByName(ctx context.Context, name, clusterID string) (*console.AgentRuntimeFragment, error) {
	if name == "" {
		return nil, fmt.Errorf("no name specified")
	}

	response, err := c.consoleClient.GetAgentRuntimeByName(ctx, name, clusterID)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if err == nil && (response == nil || response.AgentRuntime == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if response == nil {
		return nil, err
	}

	return response.AgentRuntime, err
}

func (c *client) UpsertAgentRuntime(ctx context.Context, attrs console.AgentRuntimeAttributes) (*console.AgentRuntimeFragment, error) {
	gqlClient, ok := c.consoleClient.(*console.Client)
	if !ok {
		response, err := c.consoleClient.UpsertAgentRuntime(ctx, attrs)
		if err != nil {
			return nil, err
		}
		return response.UpsertAgentRuntime, nil
	}

	vars, err := agentRuntimeAttributesVars(attrs)
	if err != nil {
		return nil, err
	}
	var res console.UpsertAgentRuntime
	if err := gqlClient.Client.Post(ctx, "UpsertAgentRuntime", console.UpsertAgentRuntimeDocument, &res, map[string]any{"attributes": vars}); err != nil {
		return nil, err
	}
	return res.UpsertAgentRuntime, nil
}

// agentRuntimeAttributesVars encodes upsert attributes so a non-nil empty createBindings is sent as [] (clear them)
// while a nil one is omitted (leave them, eg to an AgentRuntimePolicy). The generated struct's omitempty can't express that.
func agentRuntimeAttributesVars(attrs console.AgentRuntimeAttributes) (map[string]any, error) {
	raw, err := json.Marshal(attrs)
	if err != nil {
		return nil, err
	}
	vars := map[string]any{}
	if err := json.Unmarshal(raw, &vars); err != nil {
		return nil, err
	}
	if attrs.CreateBindings != nil {
		vars["createBindings"] = attrs.CreateBindings
	}
	return vars, nil
}

func (c *client) DeleteAgentRuntime(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteAgentRuntime(ctx, id)
	return err
}

func (c *client) ListAgentRuntime(ctx context.Context, after *string, first *int64, q *string, typeArg *console.AgentRuntimeType) (*console.ListAgentRuntimes_AgentRuntimes, error) {
	response, err := c.consoleClient.ListAgentRuntimes(ctx, after, first, nil, nil, q, typeArg)
	if err != nil {
		return nil, err
	}
	if response.AgentRuntimes == nil {
		return nil, stderrors.New("the response from ListAgentRuntimes is nil")
	}
	return response.AgentRuntimes, nil
}

func (c *client) ListAgentRuntimePendingRuns(ctx context.Context, id string, after *string, first *int64) (*console.ListAgentRuntimePendingRuns_AgentRuntime_PendingRuns, error) {
	response, err := c.consoleClient.ListAgentRuntimePendingRuns(ctx, id, after, first, nil, nil)
	if err != nil {
		return nil, err
	}
	if response.AgentRuntime == nil || response.AgentRuntime.PendingRuns == nil {
		return nil, stderrors.New("the response from ListAgentRuntimePendingRuns is nil")
	}
	return response.AgentRuntime.PendingRuns, nil
}
