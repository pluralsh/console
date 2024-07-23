package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type ClusterRestoreScope struct {
	Client  client.Client
	Restore *v1alpha1.ClusterRestore

	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *ClusterRestoreScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.Restore)
}

func NewClusterRestoreScope(ctx context.Context, client client.Client, restore *v1alpha1.ClusterRestore) (*ClusterRestoreScope, error) {
	if restore == nil {
		return nil, errors.New("failed to create new cluster restore scope, got nil restore")
	}

	helper, err := patch.NewHelper(restore, client)
	if err != nil {
		return nil, fmt.Errorf("failed to create new cluster restore scope, go error: %s", err)
	}

	return &ClusterRestoreScope{
		Client:      client,
		Restore:     restore,
		ctx:         ctx,
		patchHelper: helper,
	}, nil
}
