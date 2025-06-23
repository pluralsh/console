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

func (c *client) CreateProject(ctx context.Context, attributes console.ProjectAttributes) (*console.ProjectFragment, error) {
	response, err := c.consoleClient.CreateProject(ctx, attributes)
	if err != nil {
		return nil, err
	}

	return response.CreateProject, nil
}

func (c *client) GetProject(ctx context.Context, id, name *string) (*console.ProjectFragment, error) {
	if id != nil && name != nil {
		return nil, fmt.Errorf("cannot specify both id and name")
	}

	if id == nil && name == nil {
		return nil, fmt.Errorf("no id or name specified")
	}

	resourceName := lo.If(id != nil, id).Else(name)
	response, err := c.consoleClient.GetProject(ctx, id, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}
	if err == nil && (response == nil || response.Project == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *resourceName)
	}

	if response == nil {
		return nil, err
	}

	return response.Project, err
}

func (c *client) UpdateProject(ctx context.Context, id string, attributes console.ProjectAttributes) (*console.ProjectFragment, error) {
	response, err := c.consoleClient.UpdateProject(ctx, id, attributes)
	if err != nil {
		return nil, err
	}

	return response.UpdateProject, nil
}

func (c *client) DeleteProject(ctx context.Context, id string) error {
	_, err := c.consoleClient.DeleteProject(ctx, id)
	return err
}

func (c *client) IsProjectExists(ctx context.Context, id, name *string) (bool, error) {
	scm, err := c.GetProject(ctx, id, name)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return scm != nil, nil
}
