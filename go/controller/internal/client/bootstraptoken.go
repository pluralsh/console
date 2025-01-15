package client

import (
	"context"

	console "github.com/pluralsh/console/go/client"
)

func (c *client) CreateBootstrapToken(ctx context.Context, attributes console.BootstrapTokenAttributes) (*console.BootstrapTokenBase, error) {
	response, err := c.consoleClient.CreateBootstrapToken(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.CreateBootstrapToken, nil
}

func (c *client) DeleteBootstrapToken(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteBootstrapToken(ctx, id)
	return err
}
