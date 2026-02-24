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

func (c *client) CreateWorkbench(ctx context.Context, attributes console.WorkbenchAttributes) (*console.WorkbenchFragment, error) {
	response, err := c.consoleClient.CreateWorkbench(ctx, attributes)
	if err != nil {
		return nil, err
	}
	return response.CreateWorkbench, nil
}

func (c *client) UpdateWorkbench(ctx context.Context, id string, attr console.WorkbenchAttributes) (*console.WorkbenchFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.UpdateWorkbench(ctx, id, attr)
	if err != nil {
		return nil, err
	}
	return response.UpdateWorkbench, nil
}

func (c *client) GetWorkbench(ctx context.Context, id, name *string) (*console.WorkbenchFragment, error) {
	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}
	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetWorkbench(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if err == nil && (response == nil || response.Workbench == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if response == nil {
		return nil, err
	}
	return response.Workbench, err
}

func (c *client) GetWorkbenchTiny(ctx context.Context, id, name *string) (*console.GetWorkbenchTiny_Workbench, error) {
	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}
	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetWorkbenchTiny(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if err == nil && (response == nil || response.Workbench == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if response == nil {
		return nil, err
	}
	return response.Workbench, err
}

func (c *client) DeleteWorkbench(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteWorkbench(ctx, id)
	return err
}

func (c *client) IsWorkbenchExists(ctx context.Context, id, name *string) (bool, error) {
	if id == nil && name == nil {
		return false, fmt.Errorf("no id or name specified")
	}
	workbench, err := c.GetWorkbenchTiny(ctx, id, name)
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return workbench != nil, nil
}
