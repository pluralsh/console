package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&IngressReplica{}, &IngressReplicaList{})
}

// IngressReplicaList contains a list of [IngressReplica]
// +kubebuilder:object:root=true
type IngressReplicaList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []IngressReplica `json:"items"`
}

// IngressReplica is the Schema for the console ingress replica
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
type IngressReplica struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec of the IngressReplica
	// +kubebuilder:validation:Required
	Spec IngressReplicaSpec `json:"spec"`

	// Status of the IngressReplica
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

type IngressReplicaSpec struct {
	// +kubebuilder:validation:Required
	IngressRef corev1.ObjectReference `json:"ingressRef"`

	// +kubebuilder:validation:Optional
	IngressClassName *string `json:"ingressClassName,omitempty"`

	// +kubebuilder:validation:Optional
	TLS []v1.IngressTLS `json:"tls,omitempty"`

	// +kubebuilder:validation:Required
	HostMappings map[string]string `json:"hostMappings"`
}

func (in *IngressReplica) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}
