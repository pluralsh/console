package client

import (
	"context"
	console "github.com/pluralsh/console/go/client"
)

func (c *client) UpsertPrGovernance(ctx context.Context, attributes console.PrGovernanceAttributes) (*console.PrGovernanceFragment, error) {
	response, err := c.consoleClient.UpsertPrGovernance(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpsertPrGovernance, nil
}

func (c *client) DeletePrGovernance(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeletePrGovernance(ctx, id)
	return err
}
