package client

import (
	"context"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) CreateOIDCProvider(
	ctx context.Context,
	pType console.OidcProviderType,
	attributes console.OidcProviderAttributes,
) (*console.OIDCProviderFragment, error) {
	response, err := c.consoleClient.CreateOIDCProvider(ctx, pType, attributes)
	if err != nil {
		return nil, err
	}

	return response.CreateOidcProvider, nil
}

func (c *client) UpdateOIDCProvider(
	ctx context.Context,
	id string,
	pType console.OidcProviderType,
	attributes console.OidcProviderAttributes,
) (*console.OIDCProviderFragment, error) {
	response, err := c.consoleClient.UpdateOIDCProvider(ctx, id, pType, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpdateOidcProvider, nil
}

func (c *client) DeleteOIDCProvider(
	ctx context.Context,
	id string,
	pType console.OidcProviderType,
) error {
	_, err := c.consoleClient.DeleteOIDCProvider(ctx, id, pType)
	if err != nil {
		return errors.IgnoreNotFound(err)
	}

	return nil
}
