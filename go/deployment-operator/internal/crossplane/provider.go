package crossplane

import (
	"context"
	"errors"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
)

var ErrUnsupportedProvider = errors.New("unsupported crossplane cluster provider")

// Supported Crossplane Cluster API groups:
//   - AWS EKS: eks.aws.crossplane.io/v1beta1 and eks.aws.upbound.io/v1beta1/v1beta2 Cluster
//   - Azure AKS: containerservice.azure.upbound.io/v1beta1/v1beta2 KubernetesCluster
//   - GKE:     container.gcp.crossplane.io/v1beta1 Cluster (not yet supported)

// GetCluster fetches the Crossplane managed Cluster referenced by ref.
func GetCluster(ctx context.Context, c k8sClient.Client, ref corev1.ObjectReference) (ManagedCluster, error) {
	gvk, err := clusterRefGVK(ref)
	if err != nil {
		return nil, err
	}

	switch {
	case isAWSEKSClusterGVK(gvk):
		return getAWSCluster(ctx, c, ref)
	case isAzureAKSClusterGVK(gvk):
		return getAzureAKSCluster(ctx, c, ref)
	default:
		return nil, fmt.Errorf("%w: %s", ErrUnsupportedProvider, gvk.String())
	}
}

func clusterRefGVK(ref corev1.ObjectReference) (schema.GroupVersionKind, error) {
	if ref.Name == "" {
		return schema.GroupVersionKind{}, fmt.Errorf("crossplane cluster ref name is required")
	}
	if ref.APIVersion == "" || ref.Kind == "" {
		return schema.GroupVersionKind{}, fmt.Errorf("crossplane cluster ref apiVersion and kind are required")
	}

	gv, err := schema.ParseGroupVersion(ref.APIVersion)
	if err != nil {
		return schema.GroupVersionKind{}, fmt.Errorf("crossplane cluster ref apiVersion: %w", err)
	}

	return gv.WithKind(ref.Kind), nil
}
