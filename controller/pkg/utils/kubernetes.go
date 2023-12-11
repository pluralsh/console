package utils

import (
	"context"
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
