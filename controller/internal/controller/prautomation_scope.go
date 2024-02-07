package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/controller/api/v1alpha1"
)

type PrAutomationScope struct {
	Client       client.Client
	PrAutomation *v1alpha1.PrAutomation

	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *PrAutomationScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.PrAutomation)
}

func NewPrAutomationScope(ctx context.Context, client client.Client, prAutomation *v1alpha1.PrAutomation) (*PrAutomationScope, error) {
	if prAutomation == nil {
		return nil, errors.New("failed to create new PrAutomationScope from nil PrAutomation")
	}

	helper, err := patch.NewHelper(prAutomation, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &PrAutomationScope{
		Client:       client,
		PrAutomation: prAutomation,
		ctx:          ctx,
		patchHelper:  helper,
	}, nil
}
