package client

import (
	"context"

	console "github.com/pluralsh/console-client-go"
	internalerror "github.com/pluralsh/console/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) GetNamespace(ctx context.Context, id string) (*console.ManagedNamespaceFragment, error) {
	response, err := c.consoleClient.GetNamespace(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.ManagedNamespace == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}

	return response.ManagedNamespace, err
}

func (c *client) DeleteNamespace(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteNamespace(ctx, id)
	if err != nil {
		return err
	}
	return nil
}
