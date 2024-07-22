package client

import (
	"context"

	console "github.com/pluralsh/console/client"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	internalerror "github.com/pluralsh/console/controller/internal/errors"
)

func (c *client) GetClusterRestore(ctx context.Context, id string) (*console.ClusterRestoreFragment, error) {
	response, err := c.consoleClient.GetClusterRestore(ctx, id)
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

func (c *client) UpdateClusterRestore(ctx context.Context, id string, attrs console.RestoreAttributes) (*console.ClusterRestoreFragment, error) {
	restore, err := c.consoleClient.UpdateClusterRestore(ctx, id, attrs)
	if err != nil {
		return nil, err
	}

	return restore.UpdateClusterRestore, nil
}

func (c *client) CreateClusterRestore(ctx context.Context, backupId string) (*console.ClusterRestoreFragment, error) {
	restore, err := c.consoleClient.CreateClusterRestore(ctx, backupId)
	if err != nil {
		return nil, err
	}

	return restore.CreateClusterRestore, nil
}

func (c *client) IsClusterRestoreExisting(ctx context.Context, id string) (bool, error) {
	restore, err := c.GetClusterRestore(ctx, id)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return restore != nil, nil
}
