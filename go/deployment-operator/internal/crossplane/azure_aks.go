package crossplane

import (
	"context"

	xpv1 "github.com/crossplane/crossplane-runtime/apis/common/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"

	corev1 "k8s.io/api/core/v1"
)

var (
	azureAKSClusterGVK         = schema.GroupVersion{Group: "containerservice.azure.upbound.io", Version: "v1beta1"}.WithKind("KubernetesCluster")
	azureAKSClusterV2GVK       = schema.GroupVersion{Group: "containerservice.azure.upbound.io", Version: "v1beta2"}.WithKind("KubernetesCluster")
	azureAKSClusterListGVK     = azureAKSClusterGVK.GroupVersion().WithKind("KubernetesClusterList")
	azureAKSClusterV2ListGVK   = azureAKSClusterV2GVK.GroupVersion().WithKind("KubernetesClusterList")
)

func isAzureAKSClusterGVK(gvk schema.GroupVersionKind) bool {
	if gvk.Kind != "KubernetesCluster" {
		return false
	}
	if gvk.Group != azureAKSClusterGVK.Group {
		return false
	}
	return gvk.Version == azureAKSClusterGVK.Version || gvk.Version == azureAKSClusterV2GVK.Version
}

func getAzureAKSCluster(ctx context.Context, c k8sClient.Client, ref corev1.ObjectReference) (*AzureAKSCluster, error) {
	gvk, err := clusterRefGVK(ref)
	if err != nil {
		return nil, err
	}

	raw := &unstructured.Unstructured{}
	raw.SetGroupVersionKind(gvk)
	if err := c.Get(ctx, k8sClient.ObjectKey{Name: ref.Name}, raw); err != nil {
		return nil, err
	}

	cluster := &AzureAKSCluster{}
	if err := runtime.DefaultUnstructuredConverter.FromUnstructured(raw.Object, cluster); err != nil {
		return nil, err
	}
	cluster.SetGroupVersionKind(raw.GroupVersionKind())

	return cluster, nil
}

// AzureAKSCluster mirrors containerservice.azure.upbound.io KubernetesCluster.
// Only fields required for readiness and connection secret resolution are modeled.
type AzureAKSCluster struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AzureAKSClusterSpec   `json:"spec"`
	Status AzureAKSClusterStatus `json:"status,omitempty"`
}

type AzureAKSClusterSpec struct {
	xpv1.ResourceSpec `json:",inline"`
}

type AzureAKSClusterStatus struct {
	xpv1.ResourceStatus `json:",inline"`
}

// AzureAKSClusterList contains a list of AzureAKSCluster.
type AzureAKSClusterList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AzureAKSCluster `json:"items"`
}

func (in *AzureAKSCluster) GetWriteConnectionSecretToReference() *xpv1.SecretReference {
	if in == nil {
		return nil
	}
	return in.Spec.WriteConnectionSecretToReference
}

func (in *AzureAKSCluster) GetPublishConnectionDetailsTo() *xpv1.PublishConnectionDetailsTo {
	if in == nil {
		return nil
	}
	return in.Spec.PublishConnectionDetailsTo
}

func (in *AzureAKSCluster) GetCondition(ct xpv1.ConditionType) xpv1.Condition {
	if in == nil {
		return xpv1.Condition{}
	}
	return in.Status.GetCondition(ct)
}

func (in *AzureAKSCluster) DeepCopyObject() runtime.Object {
	if in == nil {
		return nil
	}
	out := &AzureAKSCluster{}
	in.DeepCopyInto(out)
	return out
}

func (in *AzureAKSCluster) DeepCopyInto(out *AzureAKSCluster) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ObjectMeta.DeepCopyInto(&out.ObjectMeta)
	out.Spec = in.Spec
	out.Status = in.Status
}

func (in *AzureAKSClusterList) DeepCopyObject() runtime.Object {
	if in == nil {
		return nil
	}
	out := &AzureAKSClusterList{}
	in.DeepCopyInto(out)
	return out
}

func (in *AzureAKSClusterList) DeepCopyInto(out *AzureAKSClusterList) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ListMeta.DeepCopyInto(&out.ListMeta)
	if in.Items != nil {
		in, out := &in.Items, &out.Items
		*out = make([]AzureAKSCluster, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
}

func (in *AzureAKSClusterList) DeepCopy() *AzureAKSClusterList {
	if in == nil {
		return nil
	}
	out := &AzureAKSClusterList{}
	in.DeepCopyInto(out)
	return out
}
