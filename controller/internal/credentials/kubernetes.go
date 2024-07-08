package credentials

import (
	"context"
	"fmt"
	"reflect"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const (
	namespacedCredentialsAnnotation = "deployments.plural.sh/namespaced-credentials"
)

func OnCredentialsChange[T client.ObjectList](c client.Client, list T) handler.EventHandler {
	return handler.EnqueueRequestsFromMapFunc(func(ctx context.Context, creds client.Object) []reconcile.Request {
		_ = c.List(ctx, list)
		items, _ := meta.ExtractList(list)
		requests := make([]reconcile.Request, 0, len(items))
		for _, item := range items {
			o := item.(client.Object)
			if hasCredentialsAnnotation(o.GetAnnotations(), creds.GetName()) {
				requests = append(requests, reconcile.Request{NamespacedName: types.NamespacedName{Name: o.GetName(), Namespace: o.GetNamespace()}})
			}
		}
		return requests
	})
}

func hasCredentialsAnnotation(annotations map[string]string, creds string) bool {
	annotation, ok := annotations[namespacedCredentialsAnnotation]
	return ok && annotation == creds
}

func SyncCredentialsInfo(object client.Object, conditionSetter func(condition metav1.Condition), creds string, err error) {
	syncCredentialsAnnotation(object, creds)
	syncCredentialsCondition(conditionSetter, creds, err)
}

func syncCredentialsAnnotation(obj client.Object, creds string) {
	annotations := obj.GetAnnotations()

	if creds != DefaultCredentialsKey {
		annotations[namespacedCredentialsAnnotation] = creds
	} else {
		delete(annotations, namespacedCredentialsAnnotation)
	}

	obj.SetAnnotations(annotations)
}

func syncCredentialsCondition(conditionSetter func(condition metav1.Condition), creds string, err error) {
	condition := metav1.Condition{Type: v1alpha1.NamespacedCredentialsConditionType.String()}

	if creds != DefaultCredentialsKey {
		condition.Reason = v1alpha1.NamespacedCredentialsReason.String()
		condition.Status = metav1.ConditionTrue
		condition.Message = fmt.Sprintf("Using %s credentials", creds)
	} else {
		condition.Reason = v1alpha1.NamespacedCredentialsReasonDefault.String()
		condition.Status = metav1.ConditionFalse
		condition.Message = v1alpha1.NamespacedCredentialsConditionMessage.String()
	}

	if err != nil {
		condition.Message += fmt.Sprintf(", got error: %s", err.Error())
	}

	conditionSetter(condition)
}

func tryAddOwnerRef(ctx context.Context, c client.Client, owner client.Object, object client.Object, scheme *runtime.Scheme) error {
	key := client.ObjectKeyFromObject(object)

	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if err := c.Get(ctx, key, object); err != nil {
			return err
		}

		if owner.GetDeletionTimestamp() != nil || object.GetDeletionTimestamp() != nil {
			return nil
		}

		original := object.DeepCopyObject().(client.Object)

		err := controllerutil.SetOwnerReference(owner, object, scheme)
		if err != nil {
			return err
		}

		if reflect.DeepEqual(original.GetOwnerReferences(), object.GetOwnerReferences()) {
			return nil
		}

		return c.Patch(ctx, object, client.MergeFromWithOptions(original, client.MergeFromWithOptimisticLock{}))
	})
}
