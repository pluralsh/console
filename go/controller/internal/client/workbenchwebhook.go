package client

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) CreateWorkbenchWebhook(ctx context.Context, workbenchID string, attributes console.WorkbenchWebhookAttributes) (*console.WorkbenchWebhookFragment, error) {
	response, err := c.consoleClient.CreateWorkbenchWebhook(ctx, workbenchID, attributes)
	if err != nil {
		return nil, err
	}
	return response.CreateWorkbenchWebhook, nil
}

func (c *client) UpdateWorkbenchWebhook(ctx context.Context, id string, attributes console.WorkbenchWebhookAttributes) (*console.WorkbenchWebhookFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.UpdateWorkbenchWebhook(ctx, id, attributes)
	if err != nil {
		return nil, err
	}
	return response.UpdateWorkbenchWebhook, nil
}

func (c *client) GetWorkbenchWebhook(ctx context.Context, id string) (*console.WorkbenchWebhookFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}
	response, err := c.consoleClient.GetWorkbenchWebhook(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.GetWorkbenchWebhook == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}
	return response.GetWorkbenchWebhook, err
}

func (c *client) DeleteWorkbenchWebhook(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteWorkbenchWebhook(ctx, id)
	return err
}

func (c *client) IsWorkbenchWebhookExists(ctx context.Context, id string) (bool, error) {
	if id == "" {
		return false, fmt.Errorf("no id specified")
	}
	webhook, err := c.GetWorkbenchWebhook(ctx, id)
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return webhook != nil, nil
}

func (c *client) GetObservabilityWebhookByName(ctx context.Context, name string) (*console.ObservabilityWebhookFragment, error) {
	response, err := c.consoleClient.GetObservabilityWebhook(ctx, nil, &name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if err == nil && (response == nil || response.ObservabilityWebhook == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if response == nil {
		return nil, err
	}
	return response.ObservabilityWebhook, err
}

func (c *client) GetIssueWebhookByName(ctx context.Context, name string) (*console.IssueWebhookFragment, error) {
	response, err := c.consoleClient.GetIssueWebhook(ctx, nil, &name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if err == nil && (response == nil || response.IssueWebhook == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if response == nil {
		return nil, err
	}
	return response.IssueWebhook, err
}
