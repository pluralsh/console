package client

import (
	"context"

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
