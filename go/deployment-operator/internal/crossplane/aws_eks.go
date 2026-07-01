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
	awsEKSClusterGVK                   = schema.GroupVersion{Group: "eks.aws.crossplane.io", Version: "v1beta1"}.WithKind("Cluster")
	awsEKSUpboundClusterGVK            = schema.GroupVersion{Group: "eks.aws.upbound.io", Version: "v1beta1"}.WithKind("Cluster")
	awsEKSUpboundClusterV1Beta2GVK     = schema.GroupVersion{Group: "eks.aws.upbound.io", Version: "v1beta2"}.WithKind("Cluster")
	awsEKSClusterListGVK               = awsEKSClusterGVK.GroupVersion().WithKind("ClusterList")
	awsEKSUpboundClusterListGVK        = awsEKSUpboundClusterGVK.GroupVersion().WithKind("ClusterList")
	awsEKSUpboundClusterV1Beta2ListGVK = awsEKSUpboundClusterV1Beta2GVK.GroupVersion().WithKind("ClusterList")
)

func isAWSEKSClusterGVK(gvk schema.GroupVersionKind) bool {
	if gvk.Kind != "Cluster" {
		return false
	}

	switch gvk.Group {
	case awsEKSClusterGVK.Group:
		return gvk.Version == awsEKSClusterGVK.Version
	case awsEKSUpboundClusterGVK.Group:
		return gvk.Version == awsEKSUpboundClusterGVK.Version || gvk.Version == awsEKSUpboundClusterV1Beta2GVK.Version
	default:
		return false
	}
}

func getAWSCluster(ctx context.Context, c k8sClient.Client, ref corev1.ObjectReference) (*AWSCluster, error) {
	gvk, err := clusterRefGVK(ref)
	if err != nil {
		return nil, err
	}

	raw := &unstructured.Unstructured{}
	raw.SetGroupVersionKind(gvk)
	if err := c.Get(ctx, k8sClient.ObjectKey{Name: ref.Name}, raw); err != nil {
		return nil, err
	}

	cluster := &AWSCluster{}
	if err := runtime.DefaultUnstructuredConverter.FromUnstructured(raw.Object, cluster); err != nil {
		return nil, err
	}
	cluster.SetGroupVersionKind(raw.GroupVersionKind())
	if err := hydrateAWSClusterConnectionSpecFromClusterAuth(ctx, c, cluster, raw.GroupVersionKind().GroupVersion()); err != nil {
		return nil, err
	}

	return cluster, nil
}

// AWSClusterGVK returns the GVK for eks.aws.crossplane.io/v1beta1 Cluster.
func AWSClusterGVK() schema.GroupVersionKind {
	return awsEKSClusterGVK
}

// AWSCluster mirrors github.com/crossplane-contrib/provider-aws/apis/eks/v1beta1 Cluster.
// Only fields required for readiness and connection secret resolution are modeled.
type AWSCluster struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AWSClusterSpec   `json:"spec"`
	Status AWSClusterStatus `json:"status,omitempty"`
}

type AWSClusterSpec struct {
	xpv1.ResourceSpec `json:",inline"`
	ForProvider       AWSClusterForProvider `json:"forProvider,omitempty"`
}

type AWSClusterForProvider struct {
	Region string `json:"region,omitempty"`
}

type AWSClusterStatus struct {
	xpv1.ResourceStatus `json:",inline"`
	AtProvider          AWSClusterAtProvider `json:"atProvider,omitempty"`
}

type AWSClusterAtProvider struct {
	Endpoint             string                           `json:"endpoint,omitempty"`
	Region               string                           `json:"region,omitempty"`
	ID                   string                           `json:"id,omitempty"`
	CertificateAuthority []AWSClusterCertificateAuthority `json:"certificateAuthority,omitempty"`
}

type AWSClusterCertificateAuthority struct {
	Data string `json:"data,omitempty"`
}

// AWSClusterList contains a list of AWSCluster.
type AWSClusterList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AWSCluster `json:"items"`
}

func (in *AWSCluster) GetWriteConnectionSecretToReference() *xpv1.SecretReference {
	if in == nil {
		return nil
	}

	return in.Spec.WriteConnectionSecretToReference
}

func (in *AWSCluster) GetPublishConnectionDetailsTo() *xpv1.PublishConnectionDetailsTo {
	if in == nil {
		return nil
	}

	return in.Spec.PublishConnectionDetailsTo
}

func (in *AWSCluster) GetCondition(ct xpv1.ConditionType) xpv1.Condition {
	if in == nil {
		return xpv1.Condition{}
	}

	return in.Status.GetCondition(ct)
}

func (in *AWSCluster) DeepCopyObject() runtime.Object {
	if in == nil {
		return nil
	}

	out := &AWSCluster{}
	in.DeepCopyInto(out)
	return out
}

func (in *AWSCluster) DeepCopyInto(out *AWSCluster) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ObjectMeta.DeepCopyInto(&out.ObjectMeta)
	out.Spec = in.Spec
	out.Status = in.Status
}

func (in *AWSClusterList) DeepCopyObject() runtime.Object {
	if in == nil {
		return nil
	}

	out := &AWSClusterList{}
	in.DeepCopyInto(out)
	return out
}

func (in *AWSClusterList) DeepCopyInto(out *AWSClusterList) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ListMeta.DeepCopyInto(&out.ListMeta)
	if in.Items != nil {
		in, out := &in.Items, &out.Items
		*out = make([]AWSCluster, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
}

func (in *AWSClusterList) DeepCopy() *AWSClusterList {
	if in == nil {
		return nil
	}

	out := &AWSClusterList{}
	in.DeepCopyInto(out)
	return out
}
