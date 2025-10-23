package client

import (
	"context"

	gqlclient "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
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
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
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
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if err == nil && (response == nil || response.ScmConnection == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}

	if response == nil {
		return nil, err
	}

	return response.ScmConnection, err
}

func (c *client) GetScmConnectionTinyByName(ctx context.Context, name string) (*gqlclient.GetScmConnectionTiny_ScmConnection, error) {
	response, err := c.consoleClient.GetScmConnectionTiny(ctx, nil, &name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if err == nil && (response == nil || response.ScmConnection == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}

	if response == nil {
		return nil, err
	}

	return response.ScmConnection, err
}

func (c *client) IsScmConnectionExists(ctx context.Context, name string) (bool, error) {
	scm, err := c.GetScmConnectionTinyByName(ctx, name)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return scm != nil, nil
}
