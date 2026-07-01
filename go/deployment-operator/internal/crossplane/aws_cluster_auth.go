package crossplane

import (
	"context"

	xpv1 "github.com/crossplane/crossplane-runtime/apis/common/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
)

var awsEKSUpboundClusterAuthGVK = schema.GroupVersion{Group: "eks.aws.upbound.io", Version: "v1beta1"}.WithKind("ClusterAuth")

func hydrateAWSClusterConnectionSpecFromClusterAuth(ctx context.Context, c k8sClient.Client, cluster *AWSCluster, gv schema.GroupVersion) error {
	if cluster == nil || HasConnectionSecretConfig(cluster) {
		return nil
	}

	ref, ok, err := clusterAuthConnectionSecretRef(ctx, c, gv, cluster.GetName())
	if err != nil {
		return err
	}
	if !ok {
		return nil
	}

	cluster.Spec.WriteConnectionSecretToReference = ref
	return nil
}

func clusterAuthConnectionSecretRef(ctx context.Context, c k8sClient.Client, gv schema.GroupVersion, clusterName string) (*xpv1.SecretReference, bool, error) {
	authGV := gv
	if authGV.Group == awsEKSUpboundClusterV1Beta2GVK.Group {
		authGV.Version = awsEKSUpboundClusterAuthGVK.Version
	}

	list := &unstructured.UnstructuredList{}
	list.SetGroupVersionKind(authGV.WithKind("ClusterAuthList"))
	if err := c.List(ctx, list); err != nil {
		return nil, false, err
	}

	for i := range list.Items {
		item := &list.Items[i]
		if !clusterAuthTargetsCluster(item, clusterName) {
			continue
		}

		name, found, err := unstructured.NestedString(item.Object, "spec", "writeConnectionSecretToRef", "name")
		if err != nil || !found || name == "" {
			continue
		}

		namespace, _, _ := unstructured.NestedString(item.Object, "spec", "writeConnectionSecretToRef", "namespace")
		return &xpv1.SecretReference{Name: name, Namespace: namespace}, true, nil
	}

	return nil, false, nil
}

func clusterAuthTargetsCluster(obj *unstructured.Unstructured, clusterName string) bool {
	if obj == nil {
		return false
	}

	forProvider, found, err := unstructured.NestedMap(obj.Object, "spec", "forProvider")
	if err != nil || !found {
		return false
	}

	if name, ok := forProvider["clusterName"].(string); ok && name == clusterName {
		return true
	}

	if ref, ok := forProvider["clusterNameRef"].(map[string]interface{}); ok {
		if name, ok := ref["name"].(string); ok && name == clusterName {
			return true
		}
	}

	return false
}
