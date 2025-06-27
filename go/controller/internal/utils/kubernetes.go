package utils

import (
	"context"
	"fmt"
	"reflect"
	"strings"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/sets"
	"k8s.io/client-go/util/retry"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

func TryAddOwnerRef(ctx context.Context, client ctrlruntimeclient.Client, owner ctrlruntimeclient.Object, object ctrlruntimeclient.Object, scheme *runtime.Scheme) error {
	key := ctrlruntimeclient.ObjectKeyFromObject(object)

	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if err := client.Get(ctx, key, object); err != nil {
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
	key := ctrlruntimeclient.ObjectKeyFromObject(controlled)

	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if err := client.Get(ctx, key, controlled); err != nil {
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
	key := ctrlruntimeclient.ObjectKeyFromObject(object)

	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if err := client.Get(ctx, key, object); err != nil {
			return fmt.Errorf("could not fetch current %s/%s state, got error: %+v", object.GetName(), object.GetNamespace(), err)
		}

		original := object.DeepCopyObject().(PatchObject)

		if reflect.DeepEqual(patch(object, original)) {
			return nil
		}

		return client.Status().Patch(ctx, object, ctrlruntimeclient.MergeFrom(original))
	})
}

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
			// finalizer removal normally happens during object cleanup, so if the object is gone already, that is absolutely fine
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

func GetSecret(ctx context.Context, client ctrlruntimeclient.Client, ref *corev1.SecretReference) (*corev1.Secret, error) {
	namespace := "default"
	if ref == nil {
		return nil, fmt.Errorf("secret reference is nil")
	}
	if ref.Namespace != "" {
		namespace = ref.Namespace
	}

	secret := &corev1.Secret{}
	if err := client.Get(ctx, types.NamespacedName{Name: ref.Name, Namespace: namespace}, secret); err != nil {
		return nil, err
	}

	return secret, nil
}

func GetCluster(ctx context.Context, client ctrlruntimeclient.Client, ref *corev1.ObjectReference) (*v1alpha1.Cluster, error) {
	cluster := &v1alpha1.Cluster{}
	if err := client.Get(ctx, types.NamespacedName{Name: ref.Name, Namespace: ref.Namespace}, cluster); err != nil {
		return nil, err
	}

	return cluster, nil
}

func GetServiceDeployment(ctx context.Context, client ctrlruntimeclient.Client, ref *corev1.ObjectReference) (*v1alpha1.ServiceDeployment, error) {
	service := &v1alpha1.ServiceDeployment{}
	if err := client.Get(ctx, types.NamespacedName{Name: ref.Name, Namespace: ref.Namespace}, service); err != nil {
		return nil, err
	}

	return service, nil
}

func GetPrAutomation(ctx context.Context, client ctrlruntimeclient.Client, ref *corev1.ObjectReference) (*v1alpha1.PrAutomation, error) {
	prAutomation := &v1alpha1.PrAutomation{}
	if err := client.Get(ctx, types.NamespacedName{Name: ref.Name, Namespace: ref.Namespace}, prAutomation); err != nil {
		return nil, err
	}

	return prAutomation, nil
}

func GetNotificationSink(ctx context.Context, client ctrlruntimeclient.Client, ref *corev1.ObjectReference) (*v1alpha1.NotificationSink, error) {
	sink := &v1alpha1.NotificationSink{}
	if err := client.Get(ctx, types.NamespacedName{Name: ref.Name, Namespace: ref.Namespace}, sink); err != nil {
		return nil, err
	}

	return sink, nil
}

func GetConfigMapData(ctx context.Context, client ctrlruntimeclient.Client, namespace string, ref *corev1.ConfigMapKeySelector) (string, error) {
	configMap := &corev1.ConfigMap{}
	if err := client.Get(ctx, types.NamespacedName{Name: ref.Name, Namespace: namespace}, configMap); err != nil {
		return "", err
	}

	if configMap.Data != nil {
		return configMap.Data[ref.Key], nil
	}

	return "", nil
}

func MarkCondition(set func(condition metav1.Condition), conditionType v1alpha1.ConditionType, conditionStatus metav1.ConditionStatus, conditionReason v1alpha1.ConditionReason, message string) {
	set(metav1.Condition{
		Type:    conditionType.String(),
		Status:  conditionStatus,
		Reason:  conditionReason.String(),
		Message: message,
	})
}

func MarkTrue(set func(metav1.Condition), conditionType v1alpha1.ConditionType, conditionReason v1alpha1.ConditionReason, message string) {
	MarkCondition(set, conditionType, metav1.ConditionTrue, conditionReason, message)
}

func MarkFalse(set func(metav1.Condition), conditionType v1alpha1.ConditionType, conditionReason v1alpha1.ConditionReason, message string) {
	MarkCondition(set, conditionType, metav1.ConditionFalse, conditionReason, message)
}

func SyncCondition(set func(condition metav1.Condition), conditionType, status, reason, message *string) {
	condition := metav1.Condition{}

	if status != nil {
		switch strings.ToLower(*status) {
		case "true":
			condition.Status = metav1.ConditionTrue
		case "false":
			condition.Status = metav1.ConditionFalse
		default:
			condition.Status = metav1.ConditionUnknown
		}
	}

	if reason != nil {
		condition.Reason = *reason
	} else if conditionType != nil {
		condition.Reason = *conditionType
	}

	if conditionType != nil {
		condition.Type = *conditionType
	}

	if message != nil {
		condition.Message = *message
	}

	set(condition)
}

func TryToUpdate(ctx context.Context, client ctrlruntimeclient.Client, object ctrlruntimeclient.Object) error {
	key := ctrlruntimeclient.ObjectKeyFromObject(object)

	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		original := object.DeepCopyObject().(ctrlruntimeclient.Object)
		if err := client.Get(ctx, key, object); err != nil {
			return fmt.Errorf("could not fetch current %s/%s state, got error: %w", object.GetName(), object.GetNamespace(), err)
		}

		if reflect.DeepEqual(object, original) {
			return nil
		}

		return client.Patch(ctx, original, ctrlruntimeclient.MergeFrom(object))
	})

}
