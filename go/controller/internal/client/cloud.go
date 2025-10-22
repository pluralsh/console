package client

import (
	"context"
	"fmt"

	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) UpsertCloudConnection(ctx context.Context, attributes console.CloudConnectionAttributes) (*console.CloudConnectionFragment, error) {
	response, err := c.consoleClient.UpsertCloudConnection(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpsertCloudConnection, nil
}

func (c *client) GetCloudConnection(ctx context.Context, id, name *string) (*console.CloudConnectionFragment, error) {
	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}

	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetCloudConnection(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if err == nil && (response == nil || response.CloudConnection == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if response == nil {
		return nil, err
	}

	return response.CloudConnection, err
}

func (c *client) DeleteCloudConnection(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteCloudConnection(ctx, id)
	return err
}

func (c *client) IsCloudConnection(ctx context.Context, name string) (bool, error) {
	connection, err := c.GetCloudConnection(ctx, nil, &name)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return connection != nil, nil
}
