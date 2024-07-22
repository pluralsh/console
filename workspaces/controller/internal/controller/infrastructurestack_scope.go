package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/controller/api/v1alpha1"
)

type InfrastructureStackScope struct {
	Client              client.Client
	infrastructureStack *v1alpha1.InfrastructureStack
	ctx                 context.Context
	patchHelper         *patch.Helper
}

func (p *InfrastructureStackScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.infrastructureStack)
}

func NewInfrastructureStackScope(ctx context.Context, client client.Client, infrastructureStack *v1alpha1.InfrastructureStack) (*InfrastructureStackScope, error) {
	if infrastructureStack == nil {
		return nil, errors.New("failed to create new InfrastructureStackScope, got nil InfrastructureStack")
	}

	helper, err := patch.NewHelper(infrastructureStack, client)
	if err != nil {
		return nil, fmt.Errorf("failed to create new InfrastructureStackScope, go error: %s", err)
	}

	return &InfrastructureStackScope{
		Client:              client,
		infrastructureStack: infrastructureStack,
		ctx:                 ctx,
		patchHelper:         helper,
	}, nil
}
