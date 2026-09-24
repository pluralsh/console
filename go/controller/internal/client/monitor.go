package client

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) CreateMonitor(ctx context.Context, attributes console.MonitorAttributes) (*console.MonitorFragment, error) {
	response, err := c.consoleClient.CreateMonitor(ctx, attributes)
	if err != nil {
		return nil, err
	}
	return response.CreateMonitor, nil
}

func (c *client) UpdateMonitor(ctx context.Context, id string, attributes console.MonitorAttributes) (*console.MonitorFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.UpdateMonitor(ctx, id, attributes)
	if err != nil {
		return nil, err
	}
	return response.UpdateMonitor, nil
}

func (c *client) GetMonitor(ctx context.Context, id string) (*console.MonitorFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}
	response, err := c.consoleClient.GetMonitor(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.Monitor == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}
	return response.Monitor, err
}

func (c *client) DeleteMonitor(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteMonitor(ctx, id)
	return err
}

func (c *client) IsMonitorExists(ctx context.Context, id string) (bool, error) {
	if id == "" {
		return false, fmt.Errorf("no id specified")
	}
	monitor, err := c.GetMonitor(ctx, id)
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return monitor != nil, nil
}
