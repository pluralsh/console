package controller

import (
	"context"
	"errors"
	"fmt"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type ClusterRestoreTrigger struct {
	Client      client.Client
	Trigger     *v1alpha1.ClusterRestoreTrigger
	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *ClusterRestoreTrigger) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.Trigger)
}

func NewClusterRestoreTriggerScope(ctx context.Context, client client.Client, trigger *v1alpha1.ClusterRestoreTrigger) (*ClusterRestoreTrigger, error) {
	if trigger == nil {
		return nil, errors.New("failed to create new scope from nil ClusterRestoreTrigger")
	}

	helper, err := patch.NewHelper(trigger, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &ClusterRestoreTrigger{
		Client:      client,
		Trigger:     trigger,
		ctx:         ctx,
		patchHelper: helper,
	}, nil
}
