package crossplane

import (
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestClusterAuthTargetsCluster(t *testing.T) {
	obj := &unstructured.Unstructured{Object: map[string]interface{}{
		"spec": map[string]interface{}{
			"forProvider": map[string]interface{}{
				"clusterNameRef": map[string]interface{}{
					"name": "cp-eks-small",
				},
			},
		},
	}}

	if !clusterAuthTargetsCluster(obj, "cp-eks-small") {
		t.Fatal("expected cluster auth to target cluster")
	}
	if clusterAuthTargetsCluster(obj, "other") {
		t.Fatal("expected cluster auth not to target other cluster")
	}
}
