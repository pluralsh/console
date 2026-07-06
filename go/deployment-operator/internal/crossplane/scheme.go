package crossplane

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

var (
	// SchemeBuilder registers Crossplane cluster types used by the deployment operator.
	SchemeBuilder = runtime.NewSchemeBuilder(addKnownTypes)
	AddToScheme   = SchemeBuilder.AddToScheme
)

func addKnownTypes(scheme *runtime.Scheme) error {
	// The Go type is AWSCluster but the CRD kind is Cluster.
	scheme.AddKnownTypeWithName(awsEKSClusterGVK, &AWSCluster{})
	scheme.AddKnownTypeWithName(awsEKSClusterListGVK, &AWSClusterList{})
	scheme.AddKnownTypeWithName(awsEKSUpboundClusterGVK, &AWSCluster{})
	scheme.AddKnownTypeWithName(awsEKSUpboundClusterListGVK, &AWSClusterList{})
	scheme.AddKnownTypeWithName(awsEKSUpboundClusterV1Beta2GVK, &AWSCluster{})
	scheme.AddKnownTypeWithName(awsEKSUpboundClusterV1Beta2ListGVK, &AWSClusterList{})
	metav1.AddToGroupVersion(scheme, awsEKSClusterGVK.GroupVersion())
	metav1.AddToGroupVersion(scheme, awsEKSUpboundClusterGVK.GroupVersion())
	metav1.AddToGroupVersion(scheme, awsEKSUpboundClusterV1Beta2GVK.GroupVersion())

	// The Go type is AzureAKSCluster but the CRD kind is KubernetesCluster.
	scheme.AddKnownTypeWithName(azureAKSClusterGVK, &AzureAKSCluster{})
	scheme.AddKnownTypeWithName(azureAKSClusterListGVK, &AzureAKSClusterList{})
	scheme.AddKnownTypeWithName(azureAKSClusterV2GVK, &AzureAKSCluster{})
	scheme.AddKnownTypeWithName(azureAKSClusterV2ListGVK, &AzureAKSClusterList{})
	metav1.AddToGroupVersion(scheme, azureAKSClusterGVK.GroupVersion())
	metav1.AddToGroupVersion(scheme, azureAKSClusterV2GVK.GroupVersion())
	// The Go type is GKECluster but the CRD kind is Cluster.
	scheme.AddKnownTypeWithName(gkeClusterGVK, &GKECluster{})
	scheme.AddKnownTypeWithName(gkeClusterListGVK, &GKEClusterList{})
	scheme.AddKnownTypeWithName(gkeClusterV2GVK, &GKECluster{})
	scheme.AddKnownTypeWithName(gkeClusterV2ListGVK, &GKEClusterList{})
	metav1.AddToGroupVersion(scheme, gkeClusterGVK.GroupVersion())
	metav1.AddToGroupVersion(scheme, gkeClusterV2GVK.GroupVersion())
	return nil
}
