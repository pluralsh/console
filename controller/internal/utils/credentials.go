package utils

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const namespacedCredentialsAnnotation = "deployments.plural.sh/namespaced-credentials"

func ListObjects[T client.ObjectList](ctx context.Context, c client.Client, list T) T {
	_ = c.List(ctx, list)
	return list
}

func RequestNamespacedCredentialsConsumersReconcile[T client.Object](items []T, credentials client.Object) []reconcile.Request {
	requests := make([]reconcile.Request, 0, len(items))
	for _, item := range items {
		if HasNamespacedCredentialsAnnotation(item.GetAnnotations(), credentials.GetName()) {
			requests = append(requests, reconcile.Request{NamespacedName: types.NamespacedName{Name: item.GetName(), Namespace: item.GetNamespace()}})
		}
	}

	return requests
}

func SyncNamespacedCredentialsAnnotation(obj client.Object, namespaceCredentials string) {
	annotations := obj.GetAnnotations()

	if namespaceCredentials != "" {
		annotations[namespacedCredentialsAnnotation] = namespaceCredentials
	} else {
		delete(annotations, namespacedCredentialsAnnotation)
	}

	obj.SetAnnotations(annotations)
}

func HasNamespacedCredentialsAnnotation(annotations map[string]string, namespaceCredentials string) bool {
	annotation, ok := annotations[namespacedCredentialsAnnotation]
	return ok && annotation == namespaceCredentials
}

func MarkCredentialsCondition(set func(condition metav1.Condition), namespacedCredentials string, err error) {
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
