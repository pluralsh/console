package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/controller/api/v1alpha1"
)

type ProjectScope struct {
	Client  client.Client
	Project *v1alpha1.Project

	ctx         context.Context
	patchHelper *patch.Helper
}

func (in *ProjectScope) PatchObject() error {
	return in.patchHelper.Patch(in.ctx, in.Project)
}

func NewProjectScope(ctx context.Context, client client.Client, project *v1alpha1.Project) (*ProjectScope, error) {
	if project == nil {
		return nil, errors.New("failed to create new ProjectScope from nil Project")
	}

	helper, err := patch.NewHelper(project, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &ProjectScope{
		Client:      client,
		Project:     project,
		ctx:         ctx,
		patchHelper: helper,
	}, nil
}
