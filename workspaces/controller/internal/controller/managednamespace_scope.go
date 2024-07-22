package controller

import (
	"context"
	"errors"
	"fmt"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type ManagedNamespaceScope struct {
	Client           client.Client
	ManagedNamespace *v1alpha1.ManagedNamespace
	ctx              context.Context
	patchHelper      *patch.Helper
}

func (p *ManagedNamespaceScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.ManagedNamespace)
}

func NewManagedNamespaceScope(ctx context.Context, client client.Client, managedNamespace *v1alpha1.ManagedNamespace) (*ManagedNamespaceScope, error) {
	if managedNamespace == nil {
		return nil, errors.New("failed to create new ManagedNamespace scope, got nil ManagedNamespace")
	}

	helper, err := patch.NewHelper(managedNamespace, client)
	if err != nil {
		return nil, fmt.Errorf("failed to create new ManagedNamespace scope, go error: %s", err)
	}

	return &ManagedNamespaceScope{
		Client:           client,
		ManagedNamespace: managedNamespace,
		ctx:              ctx,
		patchHelper:      helper,
	}, nil
}
