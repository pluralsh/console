package client

import (
	"context"

	gqlclient "github.com/pluralsh/console-client-go"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) CreateScmConnection(ctx context.Context, attributes gqlclient.ScmConnectionAttributes) (*gqlclient.ScmConnectionFragment, error) {
	response, err := c.consoleClient.CreateScmConnection(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.CreateScmConnection, err
}

func (c *client) UpdateScmConnection(ctx context.Context, id string, attributes gqlclient.ScmConnectionAttributes) (*gqlclient.ScmConnectionFragment, error) {
	response, err := c.consoleClient.UpdateScmConnection(ctx, id, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpdateScmConnection, err
}

func (c *client) DeleteScmConnection(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteScmConnection(ctx, id)

	return err
}

func (c *client) GetScmConnection(ctx context.Context, id string) (*gqlclient.ScmConnectionFragment, error) {
	response, err := c.consoleClient.GetScmConnection(ctx, id)
	if err == nil && (response == nil || response.ScmConnection == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}

	return response.ScmConnection, err
}

func (c *client) GetScmConnectionByName(ctx context.Context, name string) (*gqlclient.ScmConnectionFragment, error) {
	response, err := c.consoleClient.GetScmConnectionByName(ctx, name)
	if err == nil && (response == nil || response.ScmConnection == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}

	if response == nil {
		return nil, err
	}

	return response.ScmConnection, err
}

func (c *client) IsScmConnectionExists(ctx context.Context, name string) (bool, error) {
	scm, err := c.GetScmConnectionByName(ctx, name)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return scm != nil, nil
}
