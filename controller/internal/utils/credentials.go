package utils

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const namespacedCredentialsAnnotation = "deployments.plural.sh/namespaced-credentials"

func HandleCredentialsChange[T client.ObjectList](c client.Client, objectList T) handler.EventHandler {
	return handler.EnqueueRequestsFromMapFunc(func(ctx context.Context, credentials client.Object) []reconcile.Request {
		_ = c.List(ctx, objectList)
		items, _ := meta.ExtractList(objectList)
		requests := make([]reconcile.Request, 0, len(items))
		for _, item := range items {
			object := item.(client.Object)
			if hasCredentialsAnnotation(object.GetAnnotations(), credentials.GetName()) {
				requests = append(requests, reconcile.Request{NamespacedName: types.NamespacedName{Name: object.GetName(), Namespace: object.GetNamespace()}})
			}
		}
		return requests
	})
}

func hasCredentialsAnnotation(annotations map[string]string, namespaceCredentials string) bool {
	annotation, ok := annotations[namespacedCredentialsAnnotation]
	return ok && annotation == namespaceCredentials
}

func SyncCredentialsInfo(object client.Object, conditionSetter func(condition metav1.Condition), namespaceCredentials string, err error) {
	syncCredentialsAnnotation(object, namespaceCredentials)
	syncCredentialsCondition(conditionSetter, namespaceCredentials, err)
}

func syncCredentialsAnnotation(obj client.Object, namespaceCredentials string) {
	annotations := obj.GetAnnotations()

	if namespaceCredentials != "" {
		annotations[namespacedCredentialsAnnotation] = namespaceCredentials
	} else {
		delete(annotations, namespacedCredentialsAnnotation)
	}

	obj.SetAnnotations(annotations)
}

func syncCredentialsCondition(set func(condition metav1.Condition), namespacedCredentials string, err error) {
	condition := metav1.Condition{Type: v1alpha1.NamespacedCredentialsConditionType.String()}

	if namespacedCredentials != "" {
		condition.Reason = v1alpha1.NamespacedCredentialsReason.String()
		condition.Status = metav1.ConditionTrue
		condition.Message = fmt.Sprintf("using %s credentials", namespacedCredentials)
	} else {
		condition.Reason = v1alpha1.NamespacedCredentialsReasonDefault.String()
		condition.Status = metav1.ConditionFalse
		condition.Message = "using default credentials"
	}

	if err != nil {
		condition.Message += fmt.Sprintf(", got error: %s", err.Error())
	}

	set(condition)
}
