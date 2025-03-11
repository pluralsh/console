package client

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) GetFlow(ctx context.Context, id string) (*console.FlowFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.GetFlow(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.Flow == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}

	if response == nil {
		return nil, err
	}

	return response.Flow, err
}

func (c *client) DeleteFlow(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("no id specified")
	}

	_, err := c.consoleClient.DeleteFlow(ctx, id)
	return err
}

func (c *client) UpsertFlow(ctx context.Context, attr console.FlowAttributes) (*console.FlowFragment, error) {
	flow, err := c.consoleClient.UpsertFlow(ctx, attr)
	if err != nil {
		return nil, err
	}
	return flow.UpsertFlow, nil
}
