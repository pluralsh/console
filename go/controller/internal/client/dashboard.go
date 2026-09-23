package client

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) CreateDashboard(ctx context.Context, attributes console.DashboardAttributes) (*console.WorkbenchDashboardFragment, error) {
	response, err := c.consoleClient.CreateDashboard(ctx, attributes)
	if err != nil {
		return nil, err
	}
	return response.CreateDashboard, nil
}

func (c *client) UpdateDashboard(ctx context.Context, id string, attributes console.DashboardAttributes) (*console.WorkbenchDashboardFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.UpdateDashboard(ctx, id, attributes)
	if err != nil {
		return nil, err
	}
	return response.UpdateDashboard, nil
}

func (c *client) GetDashboard(ctx context.Context, id string) (*console.WorkbenchDashboardFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}
	response, err := c.consoleClient.GetWorkbenchDashboard(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.WorkbenchDashboard == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}
	return response.WorkbenchDashboard, err
}

func (c *client) DeleteDashboard(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteDashboard(ctx, id)
	return err
}

func (c *client) IsDashboardExists(ctx context.Context, id string) (bool, error) {
	if id == "" {
		return false, fmt.Errorf("no id specified")
	}
	dashboard, err := c.GetDashboard(ctx, id)
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return dashboard != nil, nil
}
