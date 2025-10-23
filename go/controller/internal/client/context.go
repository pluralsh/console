package client

import (
	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) GetServiceContext(name string) (*console.ServiceContextFragment, error) {
	response, err := c.consoleClient.GetServiceContext(c.ctx, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}

	if err == nil && (response == nil || response.ServiceContext == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}

	if response == nil {
		return nil, err
	}

	return response.ServiceContext, nil
}

func (c *client) GetServiceContextTiny(name string) (*console.GetServiceContextTiny_ServiceContext, error) {
	response, err := c.consoleClient.GetServiceContextTiny(c.ctx, name)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}

	if err == nil && (response == nil || response.ServiceContext == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, name)
	}

	if response == nil {
		return nil, err
	}

	return response.ServiceContext, nil
}

func (c *client) SaveServiceContext(name string, attributes console.ServiceContextAttributes) (*console.ServiceContextFragment, error) {
	response, err := c.consoleClient.SaveServiceContext(c.ctx, name, attributes)
	if err != nil {
		return nil, err
	}

	return response.SaveServiceContext, nil
}

func (c *client) DeleteServiceContext(id string) error {
	_, err := c.consoleClient.DeleteServiceContext(c.ctx, id)
	return err
}

func (c *client) IsServiceContextExists(email string) (bool, error) {
	sa, err := c.GetServiceContextTiny(email)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return sa != nil, nil
}
