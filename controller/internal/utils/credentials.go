package utils

import (
	"fmt"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
)

const NamespaacedCredentialsAnnotation = "deployments.plural.sh/namespaced-credentials"

func SyncNamespacedCredentialsAnnotation(obj ctrlruntimeclient.Object, namespaceCredentials string) {
	annotations := obj.GetAnnotations()

	if namespaceCredentials != "" {
		annotations[NamespaacedCredentialsAnnotation] = namespaceCredentials
	} else {
		delete(annotations, NamespaacedCredentialsAnnotation)
	}

	obj.SetAnnotations(annotations)
}

func HasNamespacedCredentialsAnnotation(annotations map[string]string, namespaceCredentials string) bool {
	annotation, ok := annotations[NamespaacedCredentialsAnnotation]
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
