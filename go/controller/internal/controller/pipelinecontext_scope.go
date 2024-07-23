package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type PipelineContext struct {
	Client  client.Client
	Context *v1alpha1.PipelineContext

	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *PipelineContext) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.Context)
}

func NewPipelineContextScope(ctx context.Context, client client.Client, context *v1alpha1.PipelineContext) (*PipelineContext, error) {
	if context == nil {
		return nil, errors.New("failed to create new ServiceScope from nil PipelineContext")
	}

	helper, err := patch.NewHelper(context, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &PipelineContext{
		Client:      client,
		Context:     context,
		ctx:         ctx,
		patchHelper: helper,
	}, nil
}
