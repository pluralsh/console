package client

import (
	"context"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) GetAgentRuntime(ctx context.Context, name string) (*console.AgentRuntimeFragment, error) {
	response, err := c.consoleClient.GetAgentRuntimeByName(ctx, name)
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
