package client

import (
	"context"
	"fmt"

	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
)

func (c *client) UpsertObserver(ctx context.Context, attributes console.ObserverAttributes) (*console.ObserverFragment, error) {
	response, err := c.consoleClient.UpsertObserver(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpsertObserver, err
}

func (c *client) DeleteObserver(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteObserver(ctx, id)

	return err
}

func (c *client) GetObserver(ctx context.Context, id, name *string) (*console.ObserverFragment, error) {
	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}

	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetObserver(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if err == nil && (response == nil || response.Observer == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if response == nil {
		return nil, err
	}

	return response.Observer, err
}

func (c *client) GetObserverTiny(ctx context.Context, id, name *string) (*console.GetObserverTiny_Observer, error) {
	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}

	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetObserverTiny(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if err == nil && (response == nil || response.Observer == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if response == nil {
		return nil, err
	}

	return response.Observer, err
}

func (c *client) IsObserverExists(ctx context.Context, name string) (bool, error) {
	response, err := c.GetObserverTiny(ctx, nil, &name)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return response != nil, nil
}
