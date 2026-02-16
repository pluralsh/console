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

func (c *client) CreateWorkbenchTool(ctx context.Context, attributes console.WorkbenchToolAttributes) (*console.WorkbenchToolFragment, error) {
	response, err := c.consoleClient.CreateWorkbenchTool(ctx, attributes)
	if err != nil {
		return nil, err
	}
	return response.CreateWorkbenchTool, nil
}

func (c *client) UpdateWorkbenchTool(ctx context.Context, id string, attr console.WorkbenchToolAttributes) (*console.WorkbenchToolFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.UpdateWorkbenchTool(ctx, id, attr)
	if err != nil {
		return nil, err
	}
	return response.UpdateWorkbenchTool, nil
}

func (c *client) GetWorkbenchTool(ctx context.Context, id, name *string) (*console.WorkbenchToolFragment, error) {
	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}
	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetWorkbenchTool(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if err == nil && (response == nil || response.WorkbenchTool == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if response == nil {
		return nil, err
	}
	return response.WorkbenchTool, err
}

func (c *client) GetWorkbenchToolTiny(ctx context.Context, id, name *string) (*console.GetWorkbenchToolTiny_WorkbenchTool, error) {
	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}
	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetWorkbenchToolTiny(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if err == nil && (response == nil || response.WorkbenchTool == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
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

func (c *client) IsWorkbenchToolExists(ctx context.Context, name string) (bool, error) {
	workbenchTool, err := c.GetWorkbenchToolTiny(ctx, nil, &name)
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return workbenchTool != nil, nil
}
