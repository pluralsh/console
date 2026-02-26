package kube_testing

import (
	"fmt"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

func TestTransformToUnstructured(t *testing.T) {
	for i, a := range equalObjs(t) {
		for j, b := range equalObjs(t) {
			t.Run(fmt.Sprintf("%T %d vs %T %d", a, i, b, j), func(t *testing.T) {
				equal := cmp.Equal(a, b, TransformToUnstructured())
				if !equal {
					assert.True(t, equal, cmp.Diff(a, b, TransformToUnstructured()))
				}
			})
		}
	}
}

func equalObjs(t *testing.T) []interface{} {
	return []interface{}{
		testMap(),
		*testMap(),

		ToUnstructured(t, testMap()),
		*ToUnstructured(t, testMap()),

		runtime.Object(testMap()),
		runtime.Object(ToUnstructured(t, testMap())),

		runtime.Unstructured(ToUnstructured(t, testMap())),
	}
}

func testMap() *corev1.ConfigMap {
	return &corev1.ConfigMap{
		TypeMeta: metav1.TypeMeta{
			Kind:       "ConfigMap",
			APIVersion: "v1",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "map2",
			Namespace: "test2",
		},
		Data: map[string]string{
			"key2": "value2",
		},
	}
}
