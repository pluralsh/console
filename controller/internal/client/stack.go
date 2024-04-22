package client

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console-client-go"
	internalerror "github.com/pluralsh/console/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) GetStack(ctx context.Context, id string) (*console.InfrastructureStackFragment, error) {
	response, err := c.consoleClient.GetInfrastructureStack(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.InfrastructureStack == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}

	return response.InfrastructureStack, err
}

func (c *client) DeleteStack(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteStack(ctx, id)
	if err != nil {
		return err
	}
	return nil
}

func (c *client) CreateStack(ctx context.Context, attributes console.StackAttributes) (*console.InfrastructureStackFragment, error) {
	result, err := c.consoleClient.CreateStack(ctx, attributes)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, fmt.Errorf("new created stack %s is nil", attributes.Name)
	}
	return result.CreateStack, nil

}

func (c *client) UpdateStack(ctx context.Context, id string, attributes console.StackAttributes) (*console.InfrastructureStackFragment, error) {
	result, err := c.consoleClient.UpdateStack(ctx, id, attributes)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, fmt.Errorf("updated stack %s is nil", attributes.Name)
	}
	return result.UpdateStack, nil

}
