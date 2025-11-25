package utils

import (
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"k8s.io/apimachinery/pkg/apis/meta/v1"
)

func MarkReadOnly(resource v1alpha1.ReadOnlyPluralResource) {
	MarkCondition(resource.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
	resource.SetReadOnlyStatus(true)
}
