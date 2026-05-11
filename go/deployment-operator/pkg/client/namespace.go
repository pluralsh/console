package client

import (
	"errors"

	console "github.com/pluralsh/console/go/client"
)

func (c *client) GetNamespace(id string) (*console.ManagedNamespaceFragment, error) {
	restore, err := c.consoleClient.GetNamespace(c.ctx, id)
	if err != nil {
		return nil, err
	}

	return restore.ManagedNamespace, nil
}

func (c *client) ListNamespaces(after *string, first *int64) (*console.ListClusterNamespaces_ClusterManagedNamespaces, error) {
	resp, err := c.consoleClient.ListClusterNamespaces(c.ctx, after, first, nil, nil)
	if err != nil {
		return nil, err
	}
	if resp.ClusterManagedNamespaces == nil {
		return nil, errors.New("the response from ListNamespaces is nil")
	}
	return resp.ClusterManagedNamespaces, nil
}
