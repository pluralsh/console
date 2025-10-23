package client

import (
	"context"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) GetServiceAccount(ctx context.Context, email string) (*console.UserFragment, error) {
	response, err := c.consoleClient.GetUser(ctx, email)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, email)
	}

	if err == nil && (response == nil || response.User == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, email)
	}

	if response == nil {
		return nil, err
	}

	return response.User, nil
}

func (c *client) GetServiceAccountTiny(ctx context.Context, email string) (*console.GetUserTiny_User, error) {
	response, err := c.consoleClient.GetUserTiny(ctx, email)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, email)
	}

	if err == nil && (response == nil || response.User == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, email)
	}

	if response == nil {
		return nil, err
	}

	return response.User, nil
}

func (c *client) CreateServiceAccount(ctx context.Context, attributes console.ServiceAccountAttributes) (*console.UserFragment, error) {
	response, err := c.consoleClient.CreateServiceAccount(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.CreateServiceAccount, err
}

func (c *client) CreateServiceAccountToken(ctx context.Context, id string, scopes []*console.ScopeAttributes) (*console.AccessTokenFragment, error) {
	response, err := c.consoleClient.CreateServiceAccountToken(ctx, id, scopes)
	if err != nil {
		return nil, err
	}

	return response.CreateServiceAccountToken, err
}

func (c *client) UpdateServiceAccount(ctx context.Context, id string, attributes console.ServiceAccountAttributes) (*console.UserFragment, error) {
	response, err := c.consoleClient.UpdateServiceAccount(ctx, id, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpdateServiceAccount, err
}

func (c *client) DeleteServiceAccount(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteUser(ctx, id)
	return err
}

func (c *client) IsServiceAccountExists(ctx context.Context, email string) (bool, error) {
	sa, err := c.GetServiceAccountTiny(ctx, email)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return sa != nil, nil
}
