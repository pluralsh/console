package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&ILMPolicy{}, &ILMPolicyList{})
}

//+kubebuilder:object:root=true

// ILMPolicyList contains a list of ILMPolicy.
type ILMPolicyList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ILMPolicy `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// ILMPolicy is the Schema for the ILM Policy API.
type ILMPolicy struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ILMPolicySpec `json:"spec,omitempty"`
	Status Status        `json:"status,omitempty"`
}

func (s *ILMPolicy) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

// ILMPolicySpec defines the desired state of ILMPolicy.
type ILMPolicySpec struct {
	CredentialsRef corev1.LocalObjectReference `json:"credentialsRef"`
	Definition     ILMPolicyDefinition         `json:"definition"`
}

// TODO: Representation of a elasticsearch ilm policy, just imitate our one for logstash for now
type ILMPolicyDefinition struct {
}
