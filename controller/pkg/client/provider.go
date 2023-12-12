package client

import (
	"context"

	gqlgenclient "github.com/Yamashou/gqlgenc/client"
	gqlclient "github.com/pluralsh/console-client-go"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) CreateProvider(ctx context.Context, attributes gqlclient.ClusterProviderAttributes, options ...gqlgenclient.HTTPRequestOption) (*gqlclient.ClusterProviderFragment, error) {
	response, err := c.consoleClient.CreateClusterProvider(ctx, attributes, options...)
	return response.CreateClusterProvider, err
}

func (c *client) GetProvider(ctx context.Context, id string, options ...gqlgenclient.HTTPRequestOption) (*gqlclient.ClusterProviderFragment, error) {
	response, err := c.consoleClient.GetClusterProvider(ctx, id, options...)
	if err == nil && (response == nil || response.ClusterProvider == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	return response.ClusterProvider, err
}

func (c *client) UpdateProvider(ctx context.Context, id string, attributes gqlclient.ClusterProviderUpdateAttributes, options ...gqlgenclient.HTTPRequestOption) (*gqlclient.ClusterProviderFragment, error) {
	response, err := c.consoleClient.UpdateClusterProvider(ctx, id, attributes, options...)
	if err == nil && (response == nil || response.UpdateClusterProvider == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	return response.UpdateClusterProvider, err
}

func (c *client) DeleteProvider(ctx context.Context, id string, options ...gqlgenclient.HTTPRequestOption) error {
	_, err := c.consoleClient.DeleteClusterProvider(ctx, id, options...)
	return err
}

func (c *client) IsProviderExists(ctx context.Context, id string) bool {
	_, err := c.GetProvider(ctx, id)
	if errors.IsNotFound(err) {
		return false
	}

	// We are assuming that if there is an error, and it is not ErrorNotFound then provider does not exist.
	return err == nil
}

func (c *client) IsProviderDeleting(ctx context.Context, id string) bool {
	provider, err := c.GetProvider(ctx, id)
	if err != nil {
		return false
	}

	return provider != nil && provider.DeletedAt != nil
}
