package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/controller/api/v1alpha1"
)

type ServiceScope struct {
	Client  client.Client
	Service *v1alpha1.ServiceDeployment

	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *ServiceScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.Service)
}

func NewServiceScope(ctx context.Context, client client.Client, service *v1alpha1.ServiceDeployment) (*ServiceScope, error) {
	if service == nil {
		return nil, errors.New("failed to create new ServiceScope from nil ServiceDeployment")
	}

	helper, err := patch.NewHelper(service, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &ServiceScope{
		Client:      client,
		Service:     service,
		ctx:         ctx,
		patchHelper: helper,
	}, nil
}
