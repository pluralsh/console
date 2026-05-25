package client

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
)

func (c *client) CreateWorkbenchPrompt(ctx context.Context, workbenchID string, attributes console.WorkbenchPromptAttributes) (*console.WorkbenchPromptFragment, error) {
	response, err := c.consoleClient.CreateWorkbenchPrompt(ctx, workbenchID, attributes)
	if err != nil {
		return nil, err
	}
	return response.CreateWorkbenchPrompt, nil
}

func (c *client) UpdateWorkbenchPrompt(ctx context.Context, id string, attributes console.WorkbenchPromptAttributes) (*console.WorkbenchPromptFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.UpdateWorkbenchPrompt(ctx, id, attributes)
	if err != nil {
		return nil, err
	}
	return response.UpdateWorkbenchPrompt, nil
}

func (c *client) GetWorkbenchPrompt(ctx context.Context, id string) (*console.WorkbenchPromptFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}
	response, err := c.consoleClient.GetWorkbenchPrompt(ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.WorkbenchPrompt == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}
	return response.WorkbenchPrompt, err
}

func (c *client) DeleteWorkbenchPrompt(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteWorkbenchPrompt(ctx, id)
	return err
}

func (c *client) IsWorkbenchPromptExists(ctx context.Context, id string) (bool, error) {
	if id == "" {
		return false, fmt.Errorf("no id specified")
	}
	prompt, err := c.GetWorkbenchPrompt(ctx, id)
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return prompt != nil, nil
}
