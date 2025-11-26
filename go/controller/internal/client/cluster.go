package client

import (
	stderrors "errors"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
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
	if id == nil {
		return nil, errors.NewNotFound(schema.GroupResource{}, "")
	}

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

func (c *client) GetTinyCluster(id *string) (*console.TinyClusterFragment, error) {
	if id == nil {
		return nil, errors.NewNotFound(schema.GroupResource{}, "")
	}

	response, err := c.consoleClient.GetTinyCluster(c.ctx, id)
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

func (c *client) GetClusterIdByHandle(handle string) (string, error) {
	if handle == "" {
		return "", fmt.Errorf("no handle specified")
	}
	response, err := c.consoleClient.GetClusterIDByHandle(c.ctx, &handle)
	if internalerror.IsNotFound(err) {
		return "", errors.NewNotFound(schema.GroupResource{}, handle)
	}
	if err == nil && (response == nil || response.Cluster == nil) {
		return "", errors.NewNotFound(schema.GroupResource{}, handle)
	}
	if response == nil {
		return "", err
	}

	return response.Cluster.ID, err
}

func (c *client) ListClusters() (*console.ListClusters, error) {
	return c.consoleClient.ListClusters(c.ctx, nil, nil, nil)
}

func (c *client) ListClustersWithParameters(after *string, first *int64, projectID *string, tags map[string]string) (*console.ListClustersWithParameters_Clusters, error) {
	var tagQuery *console.TagQuery

	if len(tags) > 0 {
		tagQuery = &console.TagQuery{
			Op:   "AND",
			Tags: make([]*console.TagInput, len(tags)),
		}
		for k, v := range tags {
			tagQuery.Tags = append(tagQuery.Tags, &console.TagInput{
				Name:  k,
				Value: v,
			})
		}
	}

	resp, err := c.consoleClient.ListClustersWithParameters(c.ctx, after, first, nil, nil, projectID, tagQuery)
	if err != nil {
		return nil, err
	}
	if resp.Clusters == nil {
		return nil, stderrors.New("the response from ListClustersWithParameters is nil")
	}
	return resp.Clusters, nil
}

func (c *client) DeleteCluster(id string) (*console.DeleteCluster_DeleteCluster, error) {
	response, err := c.consoleClient.DeleteCluster(c.ctx, id)
	if err != nil {
		return nil, err
	}
	if response == nil {
		return nil, err
	}

	return response.DeleteCluster, nil
}

func (c *client) IsClusterExisting(id *string) (bool, error) {
	cluster, err := c.GetTinyCluster(id)
	if errors.IsNotFound(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return cluster != nil, nil
}

func (c *client) IsClusterDeleting(id *string) bool {
	cluster, err := c.GetTinyCluster(id)
	if err != nil {
		return false
	}

	return cluster != nil && cluster.DeletedAt != nil
}
