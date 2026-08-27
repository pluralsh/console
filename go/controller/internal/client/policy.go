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

func (c *client) GetPolicy(ctx context.Context, id, name *string) (*console.PolicyFragment, error) {
	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}

	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetPolicy(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if err == nil && (response == nil || response.Policy == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if response == nil {
		return nil, err
	}

	return response.Policy, err
}

func (c *client) GetPolicyTiny(ctx context.Context, id, name *string) (*console.TinyPolicyFragment, error) {
	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}

	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetPolicyTiny(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if err == nil && (response == nil || response.Policy == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if response == nil {
		return nil, err
	}

	return response.Policy, err
}

func (c *client) CreatePolicy(ctx context.Context, attributes console.PolicyAttributes) (*console.PolicyFragment, error) {
	response, err := c.consoleClient.CreatePolicy(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.CreatePolicy, nil
}

func (c *client) UpdatePolicy(ctx context.Context, id string, attributes console.PolicyAttributes) (*console.PolicyFragment, error) {
	response, err := c.consoleClient.UpdatePolicy(ctx, id, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpdatePolicy, nil
}

func (c *client) DeletePolicy(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeletePolicy(ctx, id)
	return err
}

func (c *client) IsPolicyExists(ctx context.Context, id, name *string) (bool, error) {
	policy, err := c.GetPolicyTiny(ctx, id, name)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return policy != nil, nil
}
