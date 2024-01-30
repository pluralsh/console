package client

import (
	"context"

	gqlgenclient "github.com/Yamashou/gqlgenc/client"
	gqlclient "github.com/pluralsh/console-client-go"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) CreateScmConnection(ctx context.Context, attributes gqlclient.ScmConnectionAttributes, options ...gqlgenclient.HTTPRequestOption) (*gqlclient.ScmConnectionFragment, error) {
	response, err := c.consoleClient.CreateScmConnection(ctx, attributes, options...)
	if err != nil {
		return nil, err
	}

	return response.CreateScmConnection, err
}

func (c *client) UpdateScmConnection(ctx context.Context, id string, attributes gqlclient.ScmConnectionAttributes, options ...gqlgenclient.HTTPRequestOption) (*gqlclient.ScmConnectionFragment, error) {
	response, err := c.consoleClient.UpdateScmConnection(ctx, id, attributes, options...)
	if err != nil {
		return nil, err
	}

	return response.UpdateScmConnection, err
}

func (c *client) DeleteScmConnection(ctx context.Context, id string, options ...gqlgenclient.HTTPRequestOption) error {
	_, err := c.consoleClient.DeleteScmConnection(ctx, id, options...)

	return err
}

func (c *client) GetScmConnection(ctx context.Context, id string, options ...gqlgenclient.HTTPRequestOption) (*gqlclient.ScmConnectionFragment, error) {
	response, err := c.consoleClient.GetScmConnection(ctx, id, options...)
	if err == nil && (response == nil || response.ScmConnection == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}

	return response.ScmConnection, err
}

func (c *client) GetScmConnectionByName(ctx context.Context, name string, options ...gqlgenclient.HTTPRequestOption) (*gqlclient.ScmConnectionFragment, error) {
	response, err := c.consoleClient.GetScmConnectionByName(ctx, name, options...)
	if err == nil && (response == nil || response.ScmConnection == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}

	if response == nil {
		return nil, err
	}

	return response.ScmConnection, err
}

func (c *client) IsScmConnectionExists(ctx context.Context, name string) bool {
	_, err := c.GetScmConnection(ctx, name)
	if errors.IsNotFound(err) {
		return false
	}

	// We are assuming that if there is an error, and it is not ErrorNotFound then resource does not exist.
	return err == nil
}
