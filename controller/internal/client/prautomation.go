package client

import (
	"context"

	gqlgenclient "github.com/Yamashou/gqlgenc/client"
	console "github.com/pluralsh/console-client-go"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) CreatePrAutomation(ctx context.Context, attributes console.PrAutomationAttributes, options ...gqlgenclient.HTTPRequestOption) (*console.PrAutomationFragment, error) {
	response, err := c.consoleClient.CreatePrAutomation(ctx, attributes, options...)
	if err != nil {
		return nil, err
	}

	return response.CreatePrAutomation, err
}

func (c *client) UpdatePrAutomation(ctx context.Context, id string, attributes console.PrAutomationAttributes, options ...gqlgenclient.HTTPRequestOption) (*console.PrAutomationFragment, error) {
	response, err := c.consoleClient.UpdatePrAutomation(ctx, id, attributes, options...)
	if err != nil {
		return nil, err
	}

	return response.UpdatePrAutomation, err
}

func (c *client) DeletePrAutomation(ctx context.Context, id string, options ...gqlgenclient.HTTPRequestOption) error {
	_, err := c.consoleClient.DeletePrAutomation(ctx, id, options...)

	return err
}

func (c *client) GetPrAutomation(ctx context.Context, id string, options ...gqlgenclient.HTTPRequestOption) (*console.PrAutomationFragment, error) {
	response, err := c.consoleClient.GetPrAutomation(ctx, id, options...)
	if err == nil && (response == nil || response.PrAutomation == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}

	return response.PrAutomation, err
}

func (c *client) GetPrAutomationByName(ctx context.Context, name string, options ...gqlgenclient.HTTPRequestOption) (*console.PrAutomationFragment, error) {
	response, err := c.consoleClient.GetPrAutomationByName(ctx, name, options...)
	if err == nil && (response == nil || response.PrAutomation == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}

	if response == nil {
		return nil, err
	}

	return response.PrAutomation, err
}
