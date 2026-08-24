package client

import (
	"context"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"

	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) GetBindingPolicy(ctx context.Context, id string) (*console.BindingPolicyFragment, error) {
	response, err := c.consoleClient.GetBindingPolicy(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.BindingPolicy == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}

	return response.BindingPolicy, err
}

func (c *client) GetBindingPolicyTiny(ctx context.Context, id string) (*console.GetBindingPolicyTiny_BindingPolicy, error) {
	response, err := c.consoleClient.GetBindingPolicyTiny(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.BindingPolicy == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}

	return response.BindingPolicy, err
}

func (c *client) CreateBindingPolicy(ctx context.Context, attributes console.BindingPolicyAttributes) (*console.BindingPolicyFragment, error) {
	response, err := c.consoleClient.CreateBindingPolicy(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.CreateBindingPolicy, nil
}

func (c *client) UpdateBindingPolicy(ctx context.Context, id string, attributes console.BindingPolicyUpdateAttributes) (*console.BindingPolicyFragment, error) {
	response, err := c.consoleClient.UpdateBindingPolicy(ctx, id, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpdateBindingPolicy, nil
}

func (c *client) DeleteBindingPolicy(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteBindingPolicy(ctx, id)
	return err
}

func (c *client) IsBindingPolicyExists(ctx context.Context, id string) (bool, error) {
	bp, err := c.GetBindingPolicyTiny(ctx, id)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return bp != nil, nil
}
