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

func (c *client) UpsertObservabilityProvider(ctx context.Context, attributes console.ObservabilityProviderAttributes) (*console.ObservabilityProviderFragment, error) {
	response, err := c.consoleClient.UpsertObservabilityProvider(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpsertObservabilityProvider, err
}

func (c *client) DeleteObservabilityProvider(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteObservabilityProvider(ctx, id)

	return err
}

func (c *client) GetObservabilityProvider(ctx context.Context, id, name *string) (*console.ObservabilityProviderFragment, error) {
	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}

	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetObservabilityProvider(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if err == nil && (response == nil || response.ObservabilityProvider == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if response == nil {
		return nil, err
	}

	return response.ObservabilityProvider, err
}

func (c *client) GetObservabilityProviderTiny(ctx context.Context, id, name *string) (*console.GetObservabilityProviderTiny_ObservabilityProvider, error) {
	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}

	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetObservabilityProviderTiny(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if err == nil && (response == nil || response.ObservabilityProvider == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if response == nil {
		return nil, err
	}

	return response.ObservabilityProvider, err
}

func (c *client) IsObservabilityProviderExists(ctx context.Context, name string) (bool, error) {
	provider, err := c.GetObservabilityProviderTiny(ctx, nil, &name)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return provider != nil, nil
}
