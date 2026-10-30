package controller

import (
	"context"
	"fmt"

	"github.com/pluralsh/controller-reconcile-helper/pkg/patch"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	kerrors "k8s.io/apimachinery/pkg/util/errors"
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

// PatchObject ignores not found errors, since removing the last finalizer deletes the object
// before the remaining (eg. status) patches are issued.
func (in *DefaultScope[T]) PatchObject() error {
	return kerrors.FilterOut(in.patchHelper.Patch(in.ctx, in.object), apierrors.IsNotFound)
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
