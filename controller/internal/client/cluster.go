package client

import (
	console "github.com/pluralsh/console-client-go"
	internalerror "github.com/pluralsh/console/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func (c *client) CreateCluster(attrs console.ClusterAttributes) (*console.ClusterFragment, error) {
	response, err := c.consoleClient.CreateCluster(c.ctx, attrs)
	if err != nil {
		return nil, err
	}

	// Create cluster returns cluster fragment extended with deploy token which makes types incompatible.
	// Doing mapping here to use the same types anywhere. Deploy token is not needed at the moment anyway.
	return &console.ClusterFragment{
		ID:             response.CreateCluster.ID,
		Name:           response.CreateCluster.Name,
		Handle:         response.CreateCluster.Handle,
		Self:           response.CreateCluster.Self,
		Version:        response.CreateCluster.Version,
		InsertedAt:     response.CreateCluster.InsertedAt,
		PingedAt:       response.CreateCluster.PingedAt,
		Protect:        response.CreateCluster.Protect,
		CurrentVersion: response.CreateCluster.CurrentVersion,
		KasURL:         response.CreateCluster.KasURL,
		Tags:           response.CreateCluster.Tags,
		Credential:     response.CreateCluster.Credential,
		Provider:       response.CreateCluster.Provider,
		NodePools:      response.CreateCluster.NodePools,
	}, nil
}

func (c *client) UpdateCluster(id string, attrs console.ClusterUpdateAttributes) (*console.ClusterFragment, error) {
	response, err := c.consoleClient.UpdateCluster(c.ctx, id, attrs)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if err == nil && (response == nil || response.UpdateCluster == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, id)
	}
	if response == nil {
		return nil, err
	}

	return response.UpdateCluster, err
}

func (c *client) GetCluster(id *string) (*console.ClusterFragment, error) {
	response, err := c.consoleClient.GetCluster(c.ctx, id)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *id)
	}
	if err == nil && (response == nil || response.Cluster == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *id)
	}
	if response == nil {
		return nil, err
	}

	return response.Cluster, err
}

func (c *client) GetClusterByHandle(handle *string) (*console.ClusterFragment, error) {
	response, err := c.consoleClient.GetClusterByHandle(c.ctx, handle)
	if internalerror.IsNotFound(err) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *handle)
	}
	if err == nil && (response == nil || response.Cluster == nil) {
		return nil, errors.NewNotFound(schema.GroupResource{}, *handle)
	}
	if response == nil {
		return nil, err
	}

	return response.Cluster, err
}

func (c *client) ListClusters() (*console.ListClusters, error) {
	return c.consoleClient.ListClusters(c.ctx, nil, nil, nil)
}

func (c *client) DeleteCluster(id string) (*console.ClusterFragment, error) {
	response, err := c.consoleClient.DeleteCluster(c.ctx, id)
	if err != nil {
		return nil, err
	}
	if response == nil {
		return nil, err
	}

	return response.DeleteCluster, nil
}

func (c *client) IsClusterExisting(id *string) bool {
	_, err := c.GetCluster(id)
	if errors.IsNotFound(err) {
		return false
	}

	// We are assuming that if there is an error, and it is not ErrorNotFound then provider does not exist.
	return err == nil
}

func (c *client) IsClusterDeleting(id *string) bool {
	cluster, err := c.GetCluster(id)
	if err != nil {
		return false
	}

	return cluster != nil && cluster.DeletedAt != nil
}
