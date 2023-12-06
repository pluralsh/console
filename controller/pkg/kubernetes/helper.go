package kubernetes

import (
	"context"
	"fmt"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/sets"
	"k8s.io/client-go/util/retry"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
)

// RemoveFinalizer removes the given finalizers from the object.
func RemoveFinalizer(obj metav1.Object, toRemove ...string) {
	set := sets.NewString(obj.GetFinalizers()...)
	set.Delete(toRemove...)
	obj.SetFinalizers(set.List())
}

func TryRemoveFinalizer(ctx context.Context, client ctrlruntimeclient.Client, obj ctrlruntimeclient.Object, finalizers ...string) error {
	key := ctrlruntimeclient.ObjectKeyFromObject(obj)

	err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		// fetch the current state of the object
		if err := client.Get(ctx, key, obj); err != nil {
			// finalizer removal normally happens during object cleanup, so if
			// the object is gone already, that is absolutely fine
			if apierrors.IsNotFound(err) {
				return nil
			}
			return err
		}

		original := obj.DeepCopyObject().(ctrlruntimeclient.Object)

		// modify it
		previous := sets.NewString(obj.GetFinalizers()...)
		RemoveFinalizer(obj, finalizers...)
		current := sets.NewString(obj.GetFinalizers()...)

		// save some work
		if previous.Equal(current) {
			return nil
		}

		// update the object
		return client.Patch(ctx, obj, ctrlruntimeclient.MergeFromWithOptions(original, ctrlruntimeclient.MergeFromWithOptimisticLock{}))
	})

	if err != nil {
		kind := obj.GetObjectKind().GroupVersionKind().Kind
		return fmt.Errorf("failed to remove finalizers %v from %s %s: %w", finalizers, kind, key, err)
	}

	return nil
}

// AddFinalizer will add the given finalizer to the object. It uses a StringSet to avoid duplicates.
func AddFinalizer(obj metav1.Object, finalizers ...string) {
	set := sets.NewString(obj.GetFinalizers()...)
	set.Insert(finalizers...)
	obj.SetFinalizers(set.List())
}

func TryAddFinalizer(ctx context.Context, client ctrlruntimeclient.Client, obj ctrlruntimeclient.Object, finalizers ...string) error {
	key := ctrlruntimeclient.ObjectKeyFromObject(obj)

	err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		// fetch the current state of the object
		if err := client.Get(ctx, key, obj); err != nil {
			return err
		}

		// cannot add new finalizers to deleted objects
		if obj.GetDeletionTimestamp() != nil {
			return nil
		}

		original := obj.DeepCopyObject().(ctrlruntimeclient.Object)

		// modify it
		previous := sets.NewString(obj.GetFinalizers()...)
		AddFinalizer(obj, finalizers...)
		current := sets.NewString(obj.GetFinalizers()...)

		// save some work
		if previous.Equal(current) {
			return nil
		}

		// update the object
		return client.Patch(ctx, obj, ctrlruntimeclient.MergeFromWithOptions(original, ctrlruntimeclient.MergeFromWithOptimisticLock{}))
	})

	if err != nil {
		kind := obj.GetObjectKind().GroupVersionKind().Kind
		return fmt.Errorf("failed to add finalizers %v to %s %s: %w", finalizers, kind, key, err)
	}

	return nil
}
