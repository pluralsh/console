package client

import (
	"context"

	console "github.com/pluralsh/console/go/client"
)

func (c *client) UpsertCustomCompatibilityMatrix(ctx context.Context, attributes console.CustomCompatibilityMatrixAttributes) (*console.CustomCompatibilityMatrixFragment, error) {
	response, err := c.consoleClient.UpsertCustomCompatibilityMatrix(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpsertCustomCompatibilityMatrix, nil
}

func (c *client) DeleteCustomCompatibilityMatrix(ctx context.Context, name string) error {
	_, err := c.consoleClient.DeleteCustomCompatibilityMatrix(ctx, name)
	if err != nil {
		return err
	}
	return nil
}

func (c *client) UpsertUpgradePlanCallout(ctx context.Context, attributes console.UpgradePlanCalloutAttributes) (*console.UpgradePlanCalloutFragment, error) {
	response, err := c.consoleClient.UpsertUpgradePlanCallout(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpsertUpgradePlanCallout, nil
}

func (c *client) DeleteUpgradePlanCallout(ctx context.Context, name string) error {
	_, err := c.consoleClient.DeleteUpgradePlanCallout(ctx, name)
	if err != nil {
		return err
	}
	return nil
}
