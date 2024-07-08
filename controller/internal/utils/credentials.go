package utils

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/credentials"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
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

	if creds != credentials.DefaultCredentialsKey {
		annotations[namespacedCredentialsAnnotation] = creds
	} else {
		delete(annotations, namespacedCredentialsAnnotation)
	}

	obj.SetAnnotations(annotations)
}

func syncCredentialsCondition(conditionSetter func(condition metav1.Condition), creds string, err error) {
	condition := metav1.Condition{Type: v1alpha1.NamespacedCredentialsConditionType.String()}

	if creds != credentials.DefaultCredentialsKey {
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
