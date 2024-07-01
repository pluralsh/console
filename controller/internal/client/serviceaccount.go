package client

import (
	"context"

	console "github.com/pluralsh/console-client-go"
	"k8s.io/apimachinery/pkg/api/errors"
)

func (c *client) GetServiceAccount(ctx context.Context, email string) (*console.UserFragment, error) {
	response, err := c.consoleClient.GetUser(ctx, email)
	if err != nil {
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
	sa, err := c.GetServiceAccount(ctx, email)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return sa != nil, nil
}
