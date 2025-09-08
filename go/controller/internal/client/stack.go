package client

import (
	"context"
	"fmt"

	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) GetStack(ctx context.Context, id string) (*console.InfrastructureStackFragment, error) {
	// we assume that an empty id means the stack does not exist
	// this is to avoid making a call to the backend with an empty id
	if id == "" {
		return nil, errors.NewNotFound(schema.GroupResource{}, "")
	}
	response, err := c.consoleClient.GetInfrastructureStack(ctx, lo.ToPtr(id), nil)
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

func (c *client) GetStackById(ctx context.Context, id string) (*console.InfrastructureStackIDFragment, error) {
	if id == "" {
		return nil, errors.NewNotFound(schema.GroupResource{}, "")
	}
	response, err := c.consoleClient.GetInfrastructureStackID(ctx, lo.ToPtr(id), nil)
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

func (c *client) GetStackStatus(ctx context.Context, id string) (*console.InfrastructureStackStatusFragment, error) {
	if id == "" {
		return nil, errors.NewNotFound(schema.GroupResource{}, "")
	}
	response, err := c.consoleClient.GetInfrastructureStackStatus(ctx, lo.ToPtr(id), nil)
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
	if id == "" {
		return errors.NewNotFound(schema.GroupResource{}, "")
	}
	_, err := c.consoleClient.DeleteStack(ctx, id)
	return err
}

func (c *client) DetachStack(ctx context.Context, id string) error {
	if id == "" {
		return errors.NewNotFound(schema.GroupResource{}, "")
	}
	_, err := c.consoleClient.DetachStack(ctx, id)
	return err
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

func (c *client) DeleteCustomStackRun(ctx context.Context, id string) error {
	response, err := c.consoleClient.DeleteCustomStackRun(ctx, id)
	if internalerror.IsNotFound(err) {
		return errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.DeleteCustomStackRun == nil) {
		return errors.NewNotFound(schema.GroupResource{}, id)
	}
	return err
}

func (c *client) UpdateCustomStackRun(ctx context.Context, id string, attributes console.CustomStackRunAttributes) (*console.CustomStackRunFragment, error) {
	result, err := c.consoleClient.UpdateCustomStackRun(ctx, id, attributes)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, fmt.Errorf("update custom stack run %s is nil", attributes.Name)
	}
	return result.UpdateCustomStackRun, nil

}

func (c *client) CreateCustomStackRun(ctx context.Context, attributes console.CustomStackRunAttributes) (*console.CustomStackRunFragment, error) {
	result, err := c.consoleClient.CreateCustomStackRun(ctx, attributes)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, fmt.Errorf("create custom stack run %s is nil", attributes.Name)
	}
	return result.CreateCustomStackRun, nil

}

func (c *client) GetCustomStackRun(ctx context.Context, id string) (*console.CustomStackRunFragment, error) {
	response, err := c.consoleClient.GetCustomStackRun(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.CustomStackRun == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}

	return response.CustomStackRun, err
}
