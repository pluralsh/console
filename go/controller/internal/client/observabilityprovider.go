package client

import (
	"context"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"

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

func (c *client) GetObservabilityProvider(ctx context.Context, id string) (*console.ObservabilityProviderFragment, error) {
	response, err := c.consoleClient.GetObservabilityProvider(ctx, lo.ToPtr(id), nil)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if err == nil && (response == nil || response.ObservabilityProvider == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}

	return response.ObservabilityProvider, err
}

func (c *client) IsObservabilityProviderExists(ctx context.Context, id string) (bool, error) {
	provider, err := c.GetObservabilityProvider(ctx, id)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return provider != nil, nil
}
