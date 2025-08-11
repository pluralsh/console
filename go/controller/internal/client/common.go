package client

import (
	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) GetUser(email string) (*console.UserFragment, error) {
	response, err := c.consoleClient.GetUser(c.ctx, email)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, email)
	}
	if err == nil && (response == nil || response.User == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, email)
	}
	if response == nil {
		return nil, err
	}

	return response.User, nil
}

func (c *client) GetGroup(name string) (*console.GroupFragment, error) {
	response, err := c.consoleClient.GetGroup(c.ctx, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if err == nil && (response == nil || response.Group == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}
	if response == nil {
		return nil, err
	}

	return response.Group, nil
}
