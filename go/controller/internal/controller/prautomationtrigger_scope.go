package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type PrAutomationTrigger struct {
	Client      client.Client
	Trigger     *v1alpha1.PrAutomationTrigger
	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *PrAutomationTrigger) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.Trigger)
}

func NewPrAutomationTriggerScope(ctx context.Context, client client.Client, trigger *v1alpha1.PrAutomationTrigger) (*PrAutomationTrigger, error) {
	if trigger == nil {
		return nil, errors.New("failed to create new scope from nil PrAutomationTrigger")
	}

	helper, err := patch.NewHelper(trigger, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &PrAutomationTrigger{
		Client:      client,
		Trigger:     trigger,
		ctx:         ctx,
		patchHelper: helper,
	}, nil
}
