package client

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) GetAgentRuntime(ctx context.Context, name, clusterId string) (*console.AgentRuntimeFragment, error) {
	response, err := c.consoleClient.GetAgentRuntimeByName(ctx, name, clusterId)
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

func (c *client) UpsertAgentRuntime(ctx context.Context, attributes console.AgentRuntimeAttributes) (*console.AgentRuntimeFragment, error) {
	gqlClient, ok := c.consoleClient.(*console.Client)
	if !ok {
		return nil, fmt.Errorf("unexpected console client type %T", c.consoleClient)
	}

	var res console.UpsertAgentRuntime
	vars := map[string]any{
		"attributes": agentRuntimeAttributesVars(attributes),
	}
	if err := gqlClient.Client.Post(ctx, "UpsertAgentRuntime", console.UpsertAgentRuntimeDocument, &res, vars); err != nil {
		return nil, err
	}
	return res.UpsertAgentRuntime, nil
}

// agentRuntimeAttributesVars encodes upsert attributes so a non-nil empty createBindings
// slice is sent as [] (clear) while a nil slice omits the field (leave unchanged).
// The generated AgentRuntimeAttributes struct cannot express that because of omitempty.
func agentRuntimeAttributesVars(attrs console.AgentRuntimeAttributes) map[string]any {
	vars := map[string]any{
		"name": attrs.Name,
		"type": attrs.Type,
	}
	if attrs.ClusterID != nil {
		vars["clusterId"] = *attrs.ClusterID
	}
	if attrs.CreateBindings != nil {
		vars["createBindings"] = attrs.CreateBindings
	}
	if attrs.AiProxy != nil {
		vars["aiProxy"] = *attrs.AiProxy
	}
	if attrs.Default != nil {
		vars["default"] = *attrs.Default
	}
	if attrs.AllowedRepositories != nil {
		vars["allowedRepositories"] = attrs.AllowedRepositories
	}
	if attrs.BabysitInterval != nil {
		vars["babysitInterval"] = *attrs.BabysitInterval
	}
	if attrs.ScmConnection != nil {
		vars["scmConnection"] = *attrs.ScmConnection
	}
	return vars
}
