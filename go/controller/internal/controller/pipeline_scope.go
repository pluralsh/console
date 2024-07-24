package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type PipelineScope struct {
	Client   client.Client
	Pipeline *v1alpha1.Pipeline

	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *PipelineScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.Pipeline)
}

func NewPipelineScope(ctx context.Context, client client.Client, pipeline *v1alpha1.Pipeline) (*PipelineScope, error) {
	if pipeline == nil {
		return nil, errors.New("failed to create new pipeline scope, got nil pipeline")
	}

	helper, err := patch.NewHelper(pipeline, client)
	if err != nil {
		return nil, fmt.Errorf("failed to create new pipeline scope, go error: %s", err)
	}

	return &PipelineScope{
		Client:      client,
		Pipeline:    pipeline,
		ctx:         ctx,
		patchHelper: helper,
	}, nil
}
