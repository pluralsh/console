package client

import (
	"context"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) GetWorkbenchTool(ctx context.Context, id string) (*console.WorkbenchToolFragment, error) {
	response, err := c.consoleClient.GetWorkbenchTool(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.WorkbenchTool == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}
	return response.WorkbenchTool, err
}

func (c *client) GetWorkbenchToolTiny(ctx context.Context, id string) (*console.GetWorkbenchToolTiny_WorkbenchTool, error) {
	response, err := c.consoleClient.GetWorkbenchToolTiny(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.WorkbenchTool == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}
	return response.WorkbenchTool, err
}

func (c *client) DeleteWorkbenchTool(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteWorkbenchTool(ctx, id)
	return err
}

func (c *client) IsWorkbenchToolExists(ctx context.Context, id string) (bool, error) {
	workbenchTool, err := c.GetWorkbenchToolTiny(ctx, id)
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return workbenchTool != nil, nil
}
