package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type HelmRepositoryScope struct {
	Client         client.Client
	HelmRepository *v1alpha1.HelmRepository
	ctx            context.Context
	patchHelper    *patch.Helper
}

func (p *HelmRepositoryScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.HelmRepository)
}

func NewHelmRepositoryScope(ctx context.Context, client client.Client, helmRepository *v1alpha1.HelmRepository) (*HelmRepositoryScope, error) {
	if helmRepository == nil {
		return nil, errors.New("failed to create new HelmRepositoryScope from nil HelmRepository")
	}

	helper, err := patch.NewHelper(helmRepository, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &HelmRepositoryScope{
		Client:         client,
		HelmRepository: helmRepository,
		ctx:            ctx,
		patchHelper:    helper,
	}, nil
}
