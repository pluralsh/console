package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/controller/api/v1alpha1"
)

type ScmConnectionScope struct {
	Client        client.Client
	ScmConnection *v1alpha1.ScmConnection

	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *ScmConnectionScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.ScmConnection)
}

func NewScmConnectionScope(ctx context.Context, client client.Client, provider *v1alpha1.ScmConnection) (*ScmConnectionScope, error) {
	if provider == nil {
		return nil, errors.New("failed to create new ScmConnectionScope from nil ScmConnection")
	}

	helper, err := patch.NewHelper(provider, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &ScmConnectionScope{
		Client:        client,
		ScmConnection: provider,
		ctx:           ctx,
		patchHelper:   helper,
	}, nil
}
