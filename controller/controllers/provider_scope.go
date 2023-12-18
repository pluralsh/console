package controllers

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/controller/api/deployments/v1alpha1"
)

type ProviderScope struct {
	Client   client.Client
	Provider *v1alpha1.Provider

	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *ProviderScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.Provider)
}

func NewProviderScope(ctx context.Context, client client.Client, provider *v1alpha1.Provider) (*ProviderScope, error) {
	if provider == nil {
		return nil, errors.New("failed to create new ProviderScope from nil Provider")
	}

	helper, err := patch.NewHelper(provider, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &ProviderScope{
		Client:      client,
		Provider:    provider,
		ctx:         ctx,
		patchHelper: helper,
	}, nil
}
