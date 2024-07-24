package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type ServiceAccountScope struct {
	Client         client.Client
	ServiceAccount *v1alpha1.ServiceAccount

	ctx         context.Context
	patchHelper *patch.Helper
}

func (in *ServiceAccountScope) PatchObject() error {
	return in.patchHelper.Patch(in.ctx, in.ServiceAccount)
}

func NewServiceAccountScope(ctx context.Context, client client.Client, sa *v1alpha1.ServiceAccount) (*ServiceAccountScope, error) {
	if sa == nil {
		return nil, errors.New("failed to create new ServiceAccountScope from nil ServiceAccount")
	}

	helper, err := patch.NewHelper(sa, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &ServiceAccountScope{
		Client:         client,
		ServiceAccount: sa,
		ctx:            ctx,
		patchHelper:    helper,
	}, nil
}
