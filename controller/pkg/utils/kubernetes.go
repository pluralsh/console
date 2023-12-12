package utils

import (
	"context"
	"fmt"
	"reflect"

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/util/retry"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

func TryAddOwnerRef(ctx context.Context, client ctrlruntimeclient.Client, owner ctrlruntimeclient.Object, object ctrlruntimeclient.Object, scheme *runtime.Scheme) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if err := client.Get(ctx, ctrlruntimeclient.ObjectKeyFromObject(object), object); err != nil {
			return err
		}

		if owner.GetDeletionTimestamp() != nil || object.GetDeletionTimestamp() != nil {
			return nil
		}

		original := object.DeepCopyObject().(ctrlruntimeclient.Object)

		err := controllerutil.SetOwnerReference(owner, object, scheme)
		if err != nil {
			return err
		}

		if reflect.DeepEqual(original.GetOwnerReferences(), object.GetOwnerReferences()) {
			return nil
		}

		return client.Patch(ctx, object, ctrlruntimeclient.MergeFromWithOptions(original, ctrlruntimeclient.MergeFromWithOptimisticLock{}))
	})
}

func TryAddControllerRef(ctx context.Context, client ctrlruntimeclient.Client, owner ctrlruntimeclient.Object, controlled ctrlruntimeclient.Object, scheme *runtime.Scheme) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if err := client.Get(ctx, ctrlruntimeclient.ObjectKeyFromObject(controlled), controlled); err != nil {
			return err
		}

		if owner.GetDeletionTimestamp() != nil || controlled.GetDeletionTimestamp() != nil {
			return nil
		}

		original := controlled.DeepCopyObject().(ctrlruntimeclient.Object)

		err := controllerutil.SetControllerReference(owner, controlled, scheme)
		if err != nil {
			return err
		}

		if reflect.DeepEqual(original.GetOwnerReferences(), controlled.GetOwnerReferences()) {
			return nil
		}

		return client.Patch(ctx, controlled, ctrlruntimeclient.MergeFromWithOptions(original, ctrlruntimeclient.MergeFromWithOptimisticLock{}))
	})
}

// Patcher TODO ...
type Patcher[PatchObject ctrlruntimeclient.Object] func(object PatchObject, original PatchObject) (compare any, compareTo any)

// TryUpdateStatus TODO ...
func TryUpdateStatus[PatchObject ctrlruntimeclient.Object](ctx context.Context, client ctrlruntimeclient.Client, object PatchObject, patch Patcher[PatchObject]) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if err := client.Get(ctx, ctrlruntimeclient.ObjectKeyFromObject(object), object); err != nil {
			return fmt.Errorf("could not fetch current %s/%s state, got error: %+v", object.GetName(), object.GetNamespace(), err)
		}

		original := object.DeepCopyObject().(PatchObject)

		if reflect.DeepEqual(patch(object, original)) {
			return nil
		}

		return client.Status().Patch(ctx, object, ctrlruntimeclient.MergeFrom(original))
	})
}
