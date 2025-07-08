package client

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) UpsertPrGovernance(ctx context.Context, attributes console.PrGovernanceAttributes) (*console.PrGovernanceFragment, error) {
	response, err := c.consoleClient.UpsertPrGovernance(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpsertPrGovernance, nil
}

func (c *client) DeletePrGovernance(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeletePrGovernance(ctx, id)
	return err
}

func (c *client) GetPrGovernance(ctx context.Context, id, name *string) (*console.PrGovernanceFragment, error) {
	if id != nil && name != nil {
		return nil, fmt.Errorf("cannot specify both id and name")
	}

	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}

	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetPrGovernance(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if err == nil && (response == nil || response.PrGovernance == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if response == nil {
		return nil, err
	}

	return response.PrGovernance, err
}
