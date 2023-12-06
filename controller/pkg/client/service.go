package client

import (
	console "github.com/pluralsh/console-client-go"
)

func (c *client) GetServices() ([]*console.ServiceDeploymentBaseFragment, error) {
	resp, err := c.consoleClient.ListClusterServices(c.ctx)
	if err != nil {
		return nil, err
	}

	return resp.ClusterServices, nil
}

func (c *client) GetService(id string) (*console.ServiceDeploymentExtended, error) {
	resp, err := c.consoleClient.GetServiceDeployment(c.ctx, id)
	if err != nil {
		return nil, err
	}

	return resp.ServiceDeployment, nil
}

func (c *client) UpdateComponents(id string, components []*console.ComponentAttributes, errs []*console.ServiceErrorAttributes) error {
	_, err := c.consoleClient.UpdateServiceComponents(c.ctx, id, components, errs)
	return err
}
