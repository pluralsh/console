package crossplane

import (
	"testing"

	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/apiutil"
)

func TestAddToSchemeRegistersClusterList(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := AddToScheme(scheme); err != nil {
		t.Fatalf("AddToScheme() error = %v", err)
	}

	for _, gvk := range []struct {
		name string
		gvk  struct {
			group, version, kind string
		}
	}{
		{
			name: "crossplane-contrib",
			gvk: struct{ group, version, kind string }{
				group: "eks.aws.crossplane.io", version: "v1beta1", kind: "ClusterList",
			},
		},
		{
			name: "upbound",
			gvk: struct{ group, version, kind string }{
				group: "eks.aws.upbound.io", version: "v1beta1", kind: "ClusterList",
			},
		},
	} {
		t.Run(gvk.name, func(t *testing.T) {
			list := &AWSClusterList{}
			list.APIVersion = gvk.gvk.group + "/" + gvk.gvk.version
			list.Kind = gvk.gvk.kind

			got, err := apiutil.GVKForObject(list, scheme)
			if err != nil {
				t.Fatalf("GVKForObject() error = %v", err)
			}
			if got.Group != gvk.gvk.group || got.Version != gvk.gvk.version || got.Kind != gvk.gvk.kind {
				t.Fatalf("got GVK %s, want %s/%s %s", got, gvk.gvk.group, gvk.gvk.version, gvk.gvk.kind)
			}
		})
	}
}
