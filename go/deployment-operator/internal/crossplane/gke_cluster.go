package crossplane

import (
	"context"

	xpv1 "github.com/crossplane/crossplane-runtime/apis/common/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
)

var (
	gkeClusterGVK       = schema.GroupVersion{Group: "container.gcp.upbound.io", Version: "v1beta1"}.WithKind("Cluster")
	gkeClusterV2GVK     = schema.GroupVersion{Group: "container.gcp.upbound.io", Version: "v1beta2"}.WithKind("Cluster")
	gkeClusterListGVK   = gkeClusterGVK.GroupVersion().WithKind("ClusterList")
	gkeClusterV2ListGVK = gkeClusterV2GVK.GroupVersion().WithKind("ClusterList")
)

func isGKEClusterGVK(gvk schema.GroupVersionKind) bool {
	if gvk.Kind != "Cluster" {
		return false
	}
	if gvk.Group != gkeClusterGVK.Group {
		return false
	}
	return gvk.Version == gkeClusterGVK.Version || gvk.Version == gkeClusterV2GVK.Version
}

func getGKECluster(ctx context.Context, c k8sClient.Client, ref corev1.ObjectReference) (*GKECluster, error) {
	gvk, err := clusterRefGVK(ref)
	if err != nil {
		return nil, err
	}

	raw := &unstructured.Unstructured{}
	raw.SetGroupVersionKind(gvk)
	if err := c.Get(ctx, k8sClient.ObjectKey{Name: ref.Name}, raw); err != nil {
		return nil, err
	}

	cluster := &GKECluster{}
	if err := runtime.DefaultUnstructuredConverter.FromUnstructured(raw.Object, cluster); err != nil {
		return nil, err
	}
	cluster.SetGroupVersionKind(raw.GroupVersionKind())

	return cluster, nil
}

// GKECluster mirrors container.gcp.upbound.io Cluster.
// Only fields required for readiness and connection secret resolution are modeled.
type GKECluster struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   GKEClusterSpec   `json:"spec"`
	Status GKEClusterStatus `json:"status,omitempty"`
}

type GKEClusterSpec struct {
	xpv1.ResourceSpec `json:",inline"`
}

type GKEClusterStatus struct {
	xpv1.ResourceStatus `json:",inline"`
}

// GKEClusterList contains a list of GKECluster.
type GKEClusterList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []GKECluster `json:"items"`
}

func (in *GKECluster) GetWriteConnectionSecretToReference() *xpv1.SecretReference {
	if in == nil {
		return nil
	}
	return in.Spec.WriteConnectionSecretToReference
}

func (in *GKECluster) GetPublishConnectionDetailsTo() *xpv1.PublishConnectionDetailsTo {
	if in == nil {
		return nil
	}
	return in.Spec.PublishConnectionDetailsTo
}

func (in *GKECluster) GetCondition(ct xpv1.ConditionType) xpv1.Condition {
	if in == nil {
		return xpv1.Condition{}
	}
	return in.Status.GetCondition(ct)
}

func (in *GKECluster) DeepCopyObject() runtime.Object {
	if in == nil {
		return nil
	}
	out := &GKECluster{}
	in.DeepCopyInto(out)
	return out
}

func (in *GKECluster) DeepCopyInto(out *GKECluster) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ObjectMeta.DeepCopyInto(&out.ObjectMeta)
	out.Spec = in.Spec
	out.Status = in.Status
}

func (in *GKEClusterList) DeepCopyObject() runtime.Object {
	if in == nil {
		return nil
	}
	out := &GKEClusterList{}
	in.DeepCopyInto(out)
	return out
}

func (in *GKEClusterList) DeepCopyInto(out *GKEClusterList) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ListMeta.DeepCopyInto(&out.ListMeta)
	if in.Items != nil {
		in, out := &in.Items, &out.Items
		*out = make([]GKECluster, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
}

func (in *GKEClusterList) DeepCopy() *GKEClusterList {
	if in == nil {
		return nil
	}
	out := &GKEClusterList{}
	in.DeepCopyInto(out)
	return out
}
