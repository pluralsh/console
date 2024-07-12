package client

import (
	"context"
	"fmt"

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

func (c *client) GetNamespaceByName(ctx context.Context, name string) (*console.ManagedNamespaceFragment, error) {
	response, err := c.consoleClient.GetNamespaceByName(ctx, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if err == nil && (response == nil || response.ManagedNamespace == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
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

func (c *client) CreateNamespace(ctx context.Context, attributes console.ManagedNamespaceAttributes) (*console.ManagedNamespaceFragment, error) {
	result, err := c.consoleClient.CreateNamespace(ctx, attributes)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, fmt.Errorf("new created namespace %s is nil", attributes.Name)
	}
	return result.CreateManagedNamespace, nil

}

func (c *client) UpdateNamespace(ctx context.Context, id string, attributes console.ManagedNamespaceAttributes) (*console.ManagedNamespaceFragment, error) {
	result, err := c.consoleClient.UpdateNamespace(ctx, id, attributes)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, fmt.Errorf("new created namespace %s is nil", attributes.Name)
	}
	return result.UpdateManagedNamespace, nil

}
