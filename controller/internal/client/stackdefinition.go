package client

import (
	"context"

	gqlclient "github.com/pluralsh/console-client-go"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) CreateStackDefinition(ctx context.Context, attributes gqlclient.StackDefinitionAttributes) (*gqlclient.StackDefinitionFragment, error) {
	response, err := c.consoleClient.CreateStackDefinition(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.CreateStackDefinition, err
}

func (c *client) UpdateStackDefinition(ctx context.Context, id string, attributes gqlclient.StackDefinitionAttributes) (*gqlclient.StackDefinitionFragment, error) {
	response, err := c.consoleClient.UpdateStackDefinition(ctx, id, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpdateStackDefinition, err
}

func (c *client) DeleteStackDefinition(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteStackDefinition(ctx, id)

	return err
}

func (c *client) GetStackDefinition(ctx context.Context, id string) (*gqlclient.StackDefinitionFragment, error) {
	response, err := c.consoleClient.GetStackDefinition(ctx, id)
	if err == nil && (response == nil || response.StackDefinition == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}

	return response.StackDefinition, err
}

func (c *client) IsStackDefinitionExists(ctx context.Context, id string) (bool, error) {
	stack, err := c.GetStackDefinition(ctx, id)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return stack != nil, nil
}
