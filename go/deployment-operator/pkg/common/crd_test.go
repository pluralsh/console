package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func TestCRDUtilities(t *testing.T) {
	crd := unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "apiextensions.k8s.io/v1",
		"kind":       "CustomResourceDefinition",
		"spec": map[string]any{
			"group": "example.com",
			"names": map[string]any{"kind": "Widget", "plural": "widgets"},
			"versions": []any{
				map[string]any{"name": "v1", "served": true, "storage": true},
				map[string]any{"name": "v2", "served": false, "storage": false},
			},
		},
		"status": map[string]any{
			"conditions": []any{map[string]any{"type": "Established", "status": "True"}},
		},
	}}

	assert.True(t, IsCRD(crd))
	assert.True(t, CRDEstablished(crd))
	assert.Equal(t, []schema.GroupVersionKind{{Group: "example.com", Version: "v1", Kind: "Widget"}}, ServedCRDGVKs(crd))
	assert.False(t, CRDEstablished(unstructured.Unstructured{}))

	versions, _, _ := unstructured.NestedSlice(crd.Object, "spec", "versions")
	versions = append(versions,
		map[string]any{"name": "v3", "served": false},
		map[string]any{"name": "", "served": true},
	)
	assert.NoError(t, unstructured.SetNestedSlice(crd.Object, versions, "spec", "versions"))
	assert.Equal(t, []schema.GroupVersionKind{{Group: "example.com", Version: "v1", Kind: "Widget"}}, ServedCRDGVKs(crd))
}
