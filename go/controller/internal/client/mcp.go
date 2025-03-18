package client

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) GetMCPServer(ctx context.Context, id string) (*console.MCPServerFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.GetMCPServer(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.McpServer == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}

	return response.McpServer, err
}

func (c *client) DeleteMCPServer(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("no id specified")
	}

	_, err := c.consoleClient.DeleteMCPServer(ctx, id)
	return err
}

func (c *client) UpsertMCPServer(ctx context.Context, attr console.McpServerAttributes) (*console.MCPServerFragment, error) {
	response, err := c.consoleClient.UpsertMCPServer(ctx, attr)
	if err != nil {
		return nil, err
	}
	return response.UpsertMcpServer, nil
}
