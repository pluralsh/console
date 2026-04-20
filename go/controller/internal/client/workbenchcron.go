package client

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) CreateWorkbenchCron(ctx context.Context, workbenchID string, attributes console.WorkbenchCronAttributes) (*console.WorkbenchCronFragment, error) {
	response, err := c.consoleClient.CreateWorkbenchCron(ctx, workbenchID, attributes)
	if err != nil {
		return nil, err
	}
	return response.CreateWorkbenchCron, nil
}

func (c *client) UpdateWorkbenchCron(ctx context.Context, id string, attributes console.WorkbenchCronAttributes) (*console.WorkbenchCronFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.UpdateWorkbenchCron(ctx, id, attributes)
	if err != nil {
		return nil, err
	}
	return response.UpdateWorkbenchCron, nil
}

func (c *client) GetWorkbenchCron(ctx context.Context, id string) (*console.WorkbenchCronFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}
	response, err := c.consoleClient.GetWorkbenchCron(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.WorkbenchCron == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}
	return response.WorkbenchCron, err
}

func (c *client) DeleteWorkbenchCron(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteWorkbenchCron(ctx, id)
	return err
}

func (c *client) IsWorkbenchCronExists(ctx context.Context, id string) (bool, error) {
	if id == "" {
		return false, fmt.Errorf("no id specified")
	}
	cron, err := c.GetWorkbenchCron(ctx, id)
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return cron != nil, nil
}
