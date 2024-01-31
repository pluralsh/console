package client

import (
	console "github.com/pluralsh/console-client-go"
	internalerror "github.com/pluralsh/console/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) GetClusterRestore(id string) (*console.ClusterRestoreFragment, error) {
	response, err := c.consoleClient.GetClusterRestore(c.ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.ClusterRestore == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}

	return response.ClusterRestore, nil
}

func (c *client) UpdateClusterRestore(id string, attrs console.RestoreAttributes) (*console.ClusterRestoreFragment, error) {
	restore, err := c.consoleClient.UpdateClusterRestore(c.ctx, id, attrs)
	if err != nil {
		return nil, err
	}

	return restore.UpdateClusterRestore, nil
}

func (c *client) CreateClusterRestore(backupId string) (*console.ClusterRestoreFragment, error) {
	restore, err := c.consoleClient.CreateClusterRestore(c.ctx, backupId)
	if err != nil {
		return nil, err
	}

	return restore.CreateClusterRestore, nil
}

func (c *client) IsClusterRestoreExisting(id string) bool {
	restore, err := c.GetClusterRestore(id)
	if restore != nil {
		return true
	}
	if errors.IsNotFound(err) {
		return false
	}

	return err == nil
}

func (c *client) IsClusterRestoreDeleting(id string) bool {
	_, err := c.GetClusterRestore(id)
	if err != nil {
		return false
	}

	return false // TODO: Will it use async deletion? restore != nil && restore.DeletedAt != nil
}

func (c *client) DeleteClusterRestore(id string) (*console.ClusterRestoreFragment, error) {
	// TODO: response, err := c.consoleClient.DeleteCluster(c.ctx, id)
	//if err != nil {
	//	return nil, err
	//}
	//if response == nil {
	//	return nil, err
	//}
	//
	//return response.DeleteCluster, nil
	return nil, nil
}
