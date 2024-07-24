package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type NamespaceCredentialsScope struct {
	Client               client.Client
	NamespaceCredentials *v1alpha1.NamespaceCredentials
	ctx                  context.Context
	patchHelper          *patch.Helper
}

func (in *NamespaceCredentialsScope) PatchObject() error {
	return in.patchHelper.Patch(in.ctx, in.NamespaceCredentials)
}

func NewNamespaceCredentialsScope(ctx context.Context, client client.Client, nc *v1alpha1.NamespaceCredentials) (*NamespaceCredentialsScope, error) {
	if nc == nil {
		return nil, errors.New("failed to create new NamespaceCredentialsScope from nil NamespaceCredentials")
	}

	helper, err := patch.NewHelper(nc, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &NamespaceCredentialsScope{
		Client:               client,
		NamespaceCredentials: nc,
		ctx:                  ctx,
		patchHelper:          helper,
	}, nil
}
