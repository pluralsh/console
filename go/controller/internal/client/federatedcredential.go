package client

import (
	"context"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
)

func (c *client) CreateFederatedCredential(ctx context.Context, attributes console.FederatedCredentialAttributes) (*console.FederatedCredentialFragment, error) {
	response, err := c.consoleClient.CreateFederatedCredential(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.CreateFederatedCredential, nil
}

func (c *client) GetFederatedCredential(ctx context.Context, id string) (*console.FederatedCredentialFragment, error) {
	response, err := c.consoleClient.GetFederatedCredential(ctx, id)
	if err != nil {
		return nil, err
	}

	if response == nil || response.FederatedCredential == nil {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	return response.FederatedCredential, nil
}

func (c *client) GetFederatedCredentialTiny(ctx context.Context, id string) (*console.GetFederatedCredentialTiny_FederatedCredential, error) {
	response, err := c.consoleClient.GetFederatedCredentialTiny(ctx, id)
	if err != nil {
		return nil, err
	}

	if response == nil || response.FederatedCredential == nil {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	return response.FederatedCredential, nil
}

func (c *client) UpdateFederatedCredential(ctx context.Context, id string, attributes console.FederatedCredentialAttributes) (*console.FederatedCredentialFragment, error) {
	response, err := c.consoleClient.UpdateFederatedCredential(ctx, id, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpdateFederatedCredential, nil
}

func (c *client) DeleteFederatedCredential(ctx context.Context, id string) (*console.DeleteFederatedCredential_DeleteFederatedCredential, error) {
	response, err := c.consoleClient.DeleteFederatedCredential(ctx, id)
	if err != nil {
		return nil, err
	}

	return response.DeleteFederatedCredential, nil
}

func (c *client) IsFederatedCredentialExists(ctx context.Context, id string) (bool, error) {
	response, err := c.GetFederatedCredentialTiny(ctx, id)
	if err != nil {
		if errors.IsNotFound(err) {
			return false, nil
		}

		return false, err
	}

	return response != nil, nil
}
