package client

import (
	"context"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) UpsertHelmRepository(ctx context.Context, url string, attributes *console.HelmRepositoryAttributes) (*console.HelmRepositoryFragment, error) {
	response, err := c.consoleClient.UpsertHelmRepository(ctx, url, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpsertHelmRepository, nil
}

func (c *client) GetHelmRepository(ctx context.Context, url string) (*console.HelmRepositoryFragment, error) {
	response, err := c.consoleClient.GetHelmRepository(ctx, url)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, url)
	}
	if err == nil && (response == nil || response.HelmRepository == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, url)
	}

	if response == nil {
		return nil, err
	}

	return response.HelmRepository, err
}

func (c *client) GetHelmRepositoryTiny(ctx context.Context, url string) (*console.GetHelmRepositoryTiny_HelmRepository, error) {
	response, err := c.consoleClient.GetHelmRepositoryTiny(ctx, url)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, url)
	}
	if err == nil && (response == nil || response.HelmRepository == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, url)
	}

	if response == nil {
		return nil, err
	}

	return response.HelmRepository, err
}

func (c *client) IsHelmRepositoryExists(ctx context.Context, url string) (bool, error) {
	repo, err := c.GetHelmRepositoryTiny(ctx, url)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return repo != nil, nil
}
