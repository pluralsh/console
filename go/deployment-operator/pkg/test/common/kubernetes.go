package common

import (
	"context"

	"k8s.io/apimachinery/pkg/api/errors"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type Patcher[PatchObject client.Object] func(object PatchObject)

func MaybeCreate[O client.Object](c client.Client, object O, patch Patcher[O]) error {
	ctx := context.Background()
	original := object.DeepCopyObject().(O)

	err := c.Get(ctx, client.ObjectKey{Name: object.GetName(), Namespace: object.GetNamespace()}, object)
	if err != nil && !errors.IsNotFound(err) {
		return err
	}

	err = c.Create(ctx, object)
	if err != nil {
		return err
	}

	if patch == nil {
		return nil
	}

	err = c.Get(ctx, client.ObjectKey{Name: object.GetName(), Namespace: object.GetNamespace()}, object)
	if err != nil {
		return err
	}

	patch(object)

	return c.Status().Patch(ctx, object, client.MergeFrom(original))
}

func MaybePatch[O client.Object](c client.Client, object O, patch Patcher[O]) error {
	ctx := context.Background()
	original := object.DeepCopyObject().(O)

	err := c.Get(ctx, client.ObjectKey{Name: object.GetName(), Namespace: object.GetNamespace()}, object)
	if err != nil {
		return err
	}

	if patch == nil {
		return nil
	}

	patch(object)

	return c.Status().Patch(ctx, object, client.MergeFrom(original))
}

func MaybePatchObject[O client.Object](c client.Client, object O, patch Patcher[O]) error {
	ctx := context.Background()
	original := object.DeepCopyObject().(O)

	err := c.Get(ctx, client.ObjectKey{Name: object.GetName(), Namespace: object.GetNamespace()}, object)
	if err != nil {
		return err
	}

	if patch == nil {
		return nil
	}

	patch(object)

	return c.Patch(ctx, object, client.MergeFrom(original))
}
