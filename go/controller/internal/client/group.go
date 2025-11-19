package client

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) GetGroup(name string) (*console.GroupFragment, error) {
	response, err := c.consoleClient.GetGroup(c.ctx, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{Resource: "group"}, name)
	}
	if err == nil && (response == nil || response.Group == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{Resource: "group"}, name)
	}
	if response == nil {
		return nil, err
	}

	return response.Group, nil
}

func (c *client) GetGroupTiny(name string) (*console.GetGroupTiny_Group, error) {
	response, err := c.consoleClient.GetGroupTiny(c.ctx, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{Resource: "group"}, name)
	}
	if err == nil && (response == nil || response.Group == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{Resource: "group"}, name)
	}
	if response == nil {
		return nil, err
	}

	return response.Group, nil
}

func (c *client) IsGroupExists(name string) (bool, error) {
	if name == "" {
		return false, nil
	}

	group, err := c.GetGroupTiny(name)
	if errors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return group != nil, nil
}

func (c *client) CreateGroup(ctx context.Context, attr console.GroupAttributes) (*console.GroupFragment, error) {
	response, err := c.consoleClient.CreateGroup(ctx, attr)
	if err != nil {
		return nil, err
	}
	return response.CreateGroup, nil
}

func (c *client) UpdateGroup(ctx context.Context, id string, attr console.GroupAttributes) (*console.GroupFragment, error) {
	if id == "" {
		return nil, fmt.Errorf("no id specified")
	}

	response, err := c.consoleClient.UpdateGroup(ctx, id, attr)
	if err != nil {
		return nil, err
	}
	return response.UpdateGroup, nil
}

func (c *client) DeleteGroup(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("no id specified")
	}

	_, err := c.consoleClient.DeleteGroup(ctx, id)
	return err
}
