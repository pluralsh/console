package controllers

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/controller/api/v1alpha1"
)

type GitRepositoryScope struct {
	Client        client.Client
	GitRepository *v1alpha1.GitRepository

	ctx         context.Context
	patchHelper *patch.Helper
}

func (p *GitRepositoryScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.GitRepository)
}

func NewGitRepositoryScope(ctx context.Context, client client.Client, repository *v1alpha1.GitRepository) (*GitRepositoryScope, error) {
	if repository == nil {
		return nil, errors.New("failed to create new GitRepositoryScope from nil GitRepository")
	}

	helper, err := patch.NewHelper(repository, client)
	if err != nil {
		return nil, fmt.Errorf("failed to init patch helper: %s", err)
	}

	return &GitRepositoryScope{
		Client:        client,
		GitRepository: repository,
		ctx:           ctx,
		patchHelper:   helper,
	}, nil
}
