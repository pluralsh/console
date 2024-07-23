package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type GlobalServiceScope struct {
	Client  client.Client
	Service *v1alpha1.GlobalService

	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *GlobalServiceScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.Service)
}

func NewGlobalServiceScope(ctx context.Context, client client.Client, service *v1alpha1.GlobalService) (*GlobalServiceScope, error) {
	if service == nil {
		return nil, errors.New("failed to create new GlobalServiceScope from nil GlobalService")
	}

	helper, err := patch.NewHelper(service, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &GlobalServiceScope{
		Client:      client,
		Service:     service,
		ctx:         ctx,
		patchHelper: helper,
	}, nil
}
