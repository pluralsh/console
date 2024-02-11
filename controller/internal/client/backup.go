package client

import (
	console "github.com/pluralsh/console-client-go"
)

func (c *client) GetClusterBackup(clusterId, namespace, name *string) (*console.ClusterBackupFragment, error) {
	response, err := c.consoleClient.GetClusterBackup(c.ctx, nil, clusterId, namespace, name)
	if err != nil {
		return nil, err
	}

	return response.ClusterBackup, nil
}
