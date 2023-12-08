package client

import (
	"fmt"

	console "github.com/pluralsh/console-client-go"
)

func (c *client) GetServices() ([]*console.ServiceDeploymentBaseFragment, error) {
	resp, err := c.consoleClient.ListClusterServices(c.ctx)
	if err != nil {
		return nil, err
	}

	return resp.ClusterServices, nil
}

func (c *client) GetService(clusterID, serviceName string) (*console.ServiceDeploymentExtended, error) {
	resp, err := c.consoleClient.GetServiceDeploymentByHandle(c.ctx, clusterID, serviceName)
	if err != nil {
		return nil, err
	}

	return resp.ServiceDeployment, nil
}

func (c *client) CreateService(clusterId *string, attributes console.ServiceDeploymentAttributes) (*console.ServiceDeploymentFragment, error) {
	if clusterId == nil {
		return nil, fmt.Errorf("clusterId and clusterName can not be null")
	}

	result, err := c.consoleClient.CreateServiceDeployment(c.ctx, *clusterId, attributes)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, fmt.Errorf("new created service %s is nil", attributes.Name)
	}
	return result.CreateServiceDeployment, nil

}

func (c *client) UpdateComponents(id string, components []*console.ComponentAttributes, errs []*console.ServiceErrorAttributes) error {
	_, err := c.consoleClient.UpdateServiceComponents(c.ctx, id, components, errs)
	return err
}
