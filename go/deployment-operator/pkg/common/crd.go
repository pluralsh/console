package common

import (
	"github.com/samber/lo"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

var crdGroupKind = apiextensionsv1.SchemeGroupVersion.WithKind(CustomResourceDefinitionKind).GroupKind()

func IsCRD(resource unstructured.Unstructured) bool {
	return resource.GroupVersionKind().GroupKind() == crdGroupKind
}

func isStatusConditionTrue(resource unstructured.Unstructured, conditionType string) bool {
	conditions, _, _ := unstructured.NestedSlice(resource.Object, "status", "conditions")
	return meta.IsStatusConditionTrue(lo.FilterMap(conditions, func(condition any, _ int) (metav1.Condition, bool) {
		value, ok := condition.(map[string]any)
		if !ok {
			return metav1.Condition{}, false
		}

		currentType, typeFound, _ := unstructured.NestedString(value, "type")
		conditionStatus, statusFound, _ := unstructured.NestedString(value, "status")
		return metav1.Condition{
			Type:   currentType,
			Status: metav1.ConditionStatus(conditionStatus),
		}, typeFound && statusFound
	}), conditionType)
}

func CRDEstablished(resource unstructured.Unstructured) bool {
	return IsCRD(resource) && isStatusConditionTrue(resource, string(apiextensionsv1.Established))
}

func ServedCRDGVKs(resource unstructured.Unstructured) []schema.GroupVersionKind {
	if !IsCRD(resource) {
		return nil
	}

	crd := new(apiextensionsv1.CustomResourceDefinition)
	if err := runtime.DefaultUnstructuredConverter.FromUnstructured(resource.Object, crd); err != nil {
		return nil
	}

	return lo.FilterMap(crd.Spec.Versions, func(version apiextensionsv1.CustomResourceDefinitionVersion, _ int) (schema.GroupVersionKind, bool) {
		gvk := schema.GroupVersion{Group: crd.Spec.Group, Version: version.Name}.WithKind(crd.Spec.Names.Kind)
		return gvk, version.Served && gvk.Group != "" && gvk.Version != "" && gvk.Kind != ""
	})
}
