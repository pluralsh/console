package controller_test

import (
	"github.com/samber/lo"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

// readyStatus returns the expected status of a successfully synchronized resource with the given ID.
func readyStatus(id string) v1alpha1.Status {
	return v1alpha1.Status{
		ID: lo.ToPtr(id),
		Conditions: []metav1.Condition{
			{
				Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
				Status:  metav1.ConditionFalse,
				Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
				Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
			},
			{
				Type:    v1alpha1.ReadonlyConditionType.String(),
				Status:  metav1.ConditionFalse,
				Reason:  v1alpha1.ReadonlyConditionReason.String(),
				Message: "",
			},
			{
				Type:    v1alpha1.ReadyConditionType.String(),
				Status:  metav1.ConditionTrue,
				Reason:  v1alpha1.ReadyConditionReason.String(),
				Message: "",
			},
			{
				Type:   v1alpha1.SynchronizedConditionType.String(),
				Status: metav1.ConditionTrue,
				Reason: v1alpha1.SynchronizedConditionReason.String(),
			},
		},
	}
}
