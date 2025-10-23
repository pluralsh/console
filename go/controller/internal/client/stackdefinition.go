package client

import (
	"context"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	gqlclient "github.com/pluralsh/console/go/client"

	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
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
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if err == nil && (response == nil || response.StackDefinition == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}

	return response.StackDefinition, err
}

func (c *client) GetStackDefinitionTiny(ctx context.Context, id string) (*gqlclient.GetStackDefinitionTiny_StackDefinition, error) {
	response, err := c.consoleClient.GetStackDefinitionTiny(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if err == nil && (response == nil || response.StackDefinition == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}

	return response.StackDefinition, err
}

func (c *client) IsStackDefinitionExists(ctx context.Context, id string) (bool, error) {
	stack, err := c.GetStackDefinitionTiny(ctx, id)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return stack != nil, nil
}
