package client

import (
	"errors"

	console "github.com/pluralsh/console/go/client"
)

func (c *client) GetServices(after *string, first *int64) (*console.PagedClusterServicesForAgent, error) {
	resp, err := c.consoleClient.PagedClusterServicesForAgent(c.ctx, after, first, nil, nil)
	if err != nil {
		return nil, err
	}
	if resp.GetPagedClusterServices() == nil {
		return nil, errors.New("the response from PagedClusterServiceIds is nil")
	}
	return resp, nil
}

func (c *client) GetService(id string) (*console.ServiceDeploymentForAgent, error) {
	resp, err := c.consoleClient.GetServiceDeploymentForAgent(c.ctx, id)
	if err != nil {
		return nil, err
	}

	return resp.ServiceDeployment, nil
}

func (c *client) GetServiceDeploymentByHandle(cluster, name string) (*console.ServiceDeploymentExtended, error) {
	resp, err := c.consoleClient.GetServiceDeploymentByHandle(c.ctx, cluster, name)
	if err != nil {
		return nil, err
	}

	if resp == nil || resp.ServiceDeployment == nil {
		return nil, errors.New("service deployment not found")
	}

	return resp.ServiceDeployment, nil
}

// GetServiceTarball returns the rendered files that make up a service's
// gitops tarball via the user-authenticated `serviceTarball` GraphQL field.
// File content is returned base64-encoded by the Console; callers are
// responsible for decoding it before writing to disk.
func (c *client) GetServiceTarball(id string) ([]*console.GetServiceTarball_ServiceTarball, error) {
	resp, err := c.consoleClient.GetServiceTarball(c.ctx, id)
	if err != nil {
		return nil, err
	}

	if resp == nil {
		return nil, errors.New("empty response fetching service tarball")
	}

	return resp.ServiceTarball, nil
}

func (c *client) GetServiceDeploymentComponents(id string) (*console.GetServiceDeploymentComponents_ServiceDeployment, error) {
	resp, err := c.consoleClient.GetServiceDeploymentComponents(c.ctx, id)
	if err != nil {
		return nil, err
	}

	return resp.ServiceDeployment, nil
}

func (c *client) UpdateComponents(id, revisionID string, sha *string, components []*console.ComponentAttributes, errs []*console.ServiceErrorAttributes, metadata *console.ServiceMetadataAttributes) error {
	_, err := c.consoleClient.UpdateServiceComponents(c.ctx, id, components, revisionID, sha, errs, metadata)
	return err
}

func (c *client) UpdateServiceErrors(id string, errs []*console.ServiceErrorAttributes) error {
	_, err := c.consoleClient.AddServiceError(c.ctx, id, errs)
	return err
}
