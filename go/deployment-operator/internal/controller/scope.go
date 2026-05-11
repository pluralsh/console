package controller

import (
	"context"
	"fmt"

	"github.com/pluralsh/controller-reconcile-helper/pkg/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type Scope[T client.Object] interface {
	PatchObject() error
}

type DefaultScope[T client.Object] struct {
	client      client.Client
	object      T
	ctx         context.Context
	patchHelper *patch.Helper
}

func (in *DefaultScope[T]) PatchObject() error {
	return in.patchHelper.Patch(in.ctx, in.object)
}

func NewDefaultScope[T client.Object](ctx context.Context, client client.Client, object T) (Scope[T], error) {
	helper, err := patch.NewHelper(object, client)
	if err != nil {
		return nil, fmt.Errorf("failed to create new helper, go error: %w", err)
	}

	return &DefaultScope[T]{
		client:      client,
		object:      object,
		ctx:         ctx,
		patchHelper: helper,
	}, nil
}
