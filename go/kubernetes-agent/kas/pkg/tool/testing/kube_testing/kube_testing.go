package kube_testing

import (
	"bytes"
	"testing"

	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/api/equality"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/serializer/json"
	"sigs.k8s.io/yaml"
)

var (
	unstructuredConverter = runtime.NewTestUnstructuredConverter(equality.Semantic)
)

func ObjsToYAML(t *testing.T, objs ...runtime.Object) []byte {
	out := &bytes.Buffer{}
	w := json.YAMLFramer.NewFrameWriter(out)
	for _, obj := range objs {
		data, err := yaml.Marshal(obj)
		require.NoError(t, err)
		_, err = w.Write(data)
		require.NoError(t, err)
	}
	return out.Bytes()
}

func ToUnstructured(t *testing.T, obj runtime.Object) *unstructured.Unstructured {
	u, err := unstructuredConverter.ToUnstructured(obj)
	require.NoError(t, err)
	return &unstructured.Unstructured{
		Object: u,
	}
}
