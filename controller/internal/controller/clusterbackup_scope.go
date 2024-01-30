package controller

import (
	"context"
	"errors"
	"fmt"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type ClusterBackupScope struct {
	Client client.Client
	Backup *v1alpha1.ClusterBackup

	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *ClusterBackupScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.Backup)
}

func NewClusterBackupScope(ctx context.Context, client client.Client, backup *v1alpha1.ClusterBackup) (*ClusterBackupScope, error) {
	if backup == nil {
		return nil, errors.New("failed to create new cluster backup scope, got nil backup")
	}

	helper, err := patch.NewHelper(backup, client)
	if err != nil {
		return nil, fmt.Errorf("failed to create new cluster backup scope, go error: %s", err)
	}

	return &ClusterBackupScope{
		Client:      client,
		Backup:      backup,
		ctx:         ctx,
		patchHelper: helper,
	}, nil
}
