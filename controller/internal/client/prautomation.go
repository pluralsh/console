package client

import (
	"context"

	console "github.com/pluralsh/console-client-go"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) CreatePrAutomation(ctx context.Context, attributes console.PrAutomationAttributes) (*console.PrAutomationFragment, error) {
	response, err := c.consoleClient.CreatePrAutomation(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.CreatePrAutomation, err
}

func (c *client) UpdatePrAutomation(ctx context.Context, id string, attributes console.PrAutomationAttributes) (*console.PrAutomationFragment, error) {
	response, err := c.consoleClient.UpdatePrAutomation(ctx, id, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpdatePrAutomation, err
}

func (c *client) DeletePrAutomation(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeletePrAutomation(ctx, id)

	return err
}

func (c *client) GetPrAutomation(ctx context.Context, id string) (*console.PrAutomationFragment, error) {
	response, err := c.consoleClient.GetPrAutomation(ctx, id)
	if err == nil && (response == nil || response.PrAutomation == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}

	return response.PrAutomation, err
}

func (c *client) GetPrAutomationByName(ctx context.Context, name string) (*console.PrAutomationFragment, error) {
	response, err := c.consoleClient.GetPrAutomationByName(ctx, name)
	if err == nil && (response == nil || response.PrAutomation == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}

	if response == nil {
		return nil, err
	}

	return response.PrAutomation, err
}

func (c *client) IsPrAutomationExists(ctx context.Context, id string) bool {
	_, err := c.GetPrAutomation(ctx, id)
	if errors.IsNotFound(err) {
		return false
	}

	// We are assuming that if there is an error, and it is not ErrorNotFound then resource does not exist.
	return err == nil
}

func (c *client) IsPrAutomationExistsByName(ctx context.Context, name string) bool {
	_, err := c.GetPrAutomationByName(ctx, name)
	if errors.IsNotFound(err) {
		return false
	}

	// We are assuming that if there is an error, and it is not ErrorNotFound then resource does not exist.
	return err == nil
}

func (c *client) CreatePullRequest(ctx context.Context, prAutomationID string, branch *string, context *string) (*console.CreatePullRequest, error) {
	return c.consoleClient.CreatePullRequest(ctx, prAutomationID, branch, context)
}
