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

func (c *client) UpsertCatalog(ctx context.Context, attributes *console.CatalogAttributes) (*console.CatalogFragment, error) {
	response, err := c.consoleClient.UpsertCatalog(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpsertCatalog, nil
}

func (c *client) GetCatalog(ctx context.Context, id, name *string) (*console.CatalogFragment, error) {
	if id != nil && name != nil {
		return nil, fmt.Errorf("cannot specify both id and name")
	}

	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}

	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetCatalog(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if err == nil && (response == nil || response.Catalog == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if response == nil {
		return nil, err
	}

	return response.Catalog, err
}

func (c *client) GetCatalogTiny(ctx context.Context, id, name *string) (*console.GetCatalogTiny_Catalog, error) {
	if id != nil && name != nil {
		return nil, fmt.Errorf("cannot specify both id and name")
	}

	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}

	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetCatalogTiny(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if err == nil && (response == nil || response.Catalog == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if response == nil {
		return nil, err
	}

	return response.Catalog, err
}

func (c *client) DeleteCatalog(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteCatalog(ctx, id)
	return err
}

func (c *client) IsCatalogExists(ctx context.Context, name string) (bool, error) {
	catalog, err := c.GetCatalogTiny(ctx, nil, &name)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return catalog != nil, nil
}
