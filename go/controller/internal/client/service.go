package client

import (
	"fmt"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
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

func (c *client) GetServiceById(id string) (*console.ServiceDeploymentExtended, error) {
	if id == "" {
		return nil, errors.NewNotFound(schema.GroupResource{}, "")
	}

	response, err := c.consoleClient.GetServiceDeployment(c.ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.ServiceDeployment == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}

	return response.ServiceDeployment, err
}

func (c *client) IsServiceExisting(id string) (bool, error) {
	service, err := c.GetServiceById(id)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return service != nil, nil
}

func (c *client) IsServiceDeleting(id string) bool {
	service, err := c.GetServiceById(id)
	if err != nil {
		return false
	}

	return service != nil && service.DeletedAt != nil
}

func (c *client) CreateService(clusterId *string, attributes console.ServiceDeploymentAttributes) (*console.ServiceDeploymentExtended, error) {
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

func (c *client) UpdateService(serviceId string, attributes console.ServiceUpdateAttributes) error {
	_, err := c.consoleClient.UpdateServiceDeployment(c.ctx, serviceId, attributes)
	if err != nil {
		return err
	}
	return nil
}

func (c *client) DeleteService(serviceId string) error {
	_, err := c.consoleClient.DeleteServiceDeployment(c.ctx, serviceId)
	if err != nil {
		return err
	}
	return nil
}

func (c *client) DetachService(serviceId string) error {
	_, err := c.consoleClient.DetachServiceDeployment(c.ctx, serviceId)
	if err != nil {
		return err
	}
	return nil
}
