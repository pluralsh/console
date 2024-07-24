package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type DeploymentSettingsScope struct {
	Client             client.Client
	DeploymentSettings *v1alpha1.DeploymentSettings

	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *DeploymentSettingsScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.DeploymentSettings)
}

func NewDeploymentSettingsScope(ctx context.Context, client client.Client, ds *v1alpha1.DeploymentSettings) (*DeploymentSettingsScope, error) {
	if ds == nil {
		return nil, errors.New("failed to create new DeploymentSettingsScope from nil DeploymentSettings")
	}

	helper, err := patch.NewHelper(ds, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &DeploymentSettingsScope{
		Client:             client,
		DeploymentSettings: ds,
		ctx:                ctx,
		patchHelper:        helper,
	}, nil
}
