package client

import (
	console "github.com/pluralsh/console/go/client"
)

func (c *client) GetClusterRestore(id string) (*console.ClusterRestoreFragment, error) {
	restore, err := c.consoleClient.GetClusterRestore(c.ctx, id)
	if err != nil {
		return nil, err
	}

	return restore.ClusterRestore, nil
}

func (c *client) UpdateClusterRestore(id string, attrs console.RestoreAttributes) (*console.ClusterRestoreFragment, error) {
	restore, err := c.consoleClient.UpdateClusterRestore(c.ctx, id, attrs)
	if err != nil {
		return nil, err
	}

	return restore.UpdateClusterRestore, nil
}
