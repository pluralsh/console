package client

import (
	"fmt"

	console "github.com/pluralsh/console/client"
)

func (c *client) GetGlobalService(id string) (*console.GlobalServiceFragment, error) {
	resp, err := c.consoleClient.GetGlobalServiceDeployment(c.ctx, id)
	if err != nil {
		return nil, err
	}

	return resp.GlobalService, nil
}

func (c *client) CreateGlobalService(serviceID string, attributes console.GlobalServiceAttributes) (*console.GlobalServiceFragment, error) {
	result, err := c.consoleClient.CreateGlobalServiceDeployment(c.ctx, serviceID, attributes)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, fmt.Errorf("new created global service %s is nil", attributes.Name)
	}
	return result.CreateGlobalService, nil

}

func (c *client) CreateGlobalServiceFromTemplate(attributes console.GlobalServiceAttributes) (*console.GlobalServiceFragment, error) {
	result, err := c.consoleClient.CreateGlobalServiceDeploymentFromTemplate(c.ctx, attributes)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, fmt.Errorf("new created global service %s is nil", attributes.Name)
	}
	return result.CreateGlobalService, nil

}

func (c *client) DeleteGlobalService(id string) error {
	_, err := c.consoleClient.DeleteGlobalServiceDeployment(c.ctx, id)
	if err != nil {
		return err
	}

	return nil
}

func (c *client) UpdateGlobalService(id string, attributes console.GlobalServiceAttributes) (*console.GlobalServiceFragment, error) {
	result, err := c.consoleClient.UpdateGlobalServiceDeployment(c.ctx, id, attributes)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, fmt.Errorf("updated global service %s is nil", attributes.Name)
	}
	return result.UpdateGlobalService, nil

}
