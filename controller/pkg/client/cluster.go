package client

import (
	console "github.com/pluralsh/console-client-go"
)

func (c *client) CreateCluster(attrs console.ClusterAttributes) (*console.CreateCluster, error) {
	return c.consoleClient.CreateCluster(c.ctx, attrs)
}

func (c *client) GetCluster(id *string) (*console.ClusterFragment, error) {
	response, err := c.consoleClient.GetCluster(c.ctx, id)
	if err != nil {
		return nil, err
	}

	return response.Cluster, nil
}

func (c *client) ListClusters() (*console.ListClusters, error) {
	return c.consoleClient.ListClusters(c.ctx, nil, nil, nil)
}

func (c *client) DeleteCluster(id string) (*console.ClusterFragment, error) {
	response, err := c.consoleClient.DeleteCluster(c.ctx, id)
	if err != nil {
		return nil, err
	}

	return response.DeleteCluster, nil
}
