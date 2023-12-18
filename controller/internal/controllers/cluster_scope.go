package controllers

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/controller/api/v1alpha1"
)

type ClusterScope struct {
	Client  client.Client
	Cluster *v1alpha1.Cluster

	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *ClusterScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.Cluster)
}

func NewClusterScope(ctx context.Context, client client.Client, cluster *v1alpha1.Cluster) (*ClusterScope, error) {
	if cluster == nil {
		return nil, errors.New("failed to create new cluster scope, got nil cluster")
	}

	helper, err := patch.NewHelper(cluster, client)
	if err != nil {
		return nil, fmt.Errorf("failed to create new cluster scope, go error: %s", err)
	}

	return &ClusterScope{
		Client:      client,
		Cluster:     cluster,
		ctx:         ctx,
		patchHelper: helper,
	}, nil
}
