package client

import (
	console "github.com/pluralsh/console/go/client"
)

func (c *client) SaveClusterBackup(attrs console.BackupAttributes) (*console.ClusterBackupFragment, error) {
	backup, err := c.consoleClient.CreateClusterBackup(c.ctx, attrs)
	if err != nil {
		return nil, err
	}

	return backup.CreateClusterBackup, nil
}

func (c *client) GetClusterBackup(clusterID, namespace, name string) (*console.ClusterBackupFragment, error) {
	backup, err := c.consoleClient.GetClusterBackup(c.ctx, nil, &clusterID, &namespace, &name)
	if err != nil {
		return nil, err
	}

	return backup.ClusterBackup, nil
}
