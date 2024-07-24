package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type CustomStackRunScope struct {
	Client         client.Client
	CustomStackRun *v1alpha1.CustomStackRun

	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *CustomStackRunScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.CustomStackRun)
}

func NewCustomStackRunScope(ctx context.Context, client client.Client, customStackRun *v1alpha1.CustomStackRun) (*CustomStackRunScope, error) {
	if customStackRun == nil {
		return nil, errors.New("failed to create new CustomStackRunScope from nil CustomStackRun")
	}

	helper, err := patch.NewHelper(customStackRun, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &CustomStackRunScope{
		Client:         client,
		CustomStackRun: customStackRun,
		ctx:            ctx,
		patchHelper:    helper,
	}, nil
}
