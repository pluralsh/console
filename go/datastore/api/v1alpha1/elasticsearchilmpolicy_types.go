package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

func init() {
	SchemeBuilder.Register(&ElasticsearchILMPolicy{}, &ElasticsearchILMPolicyList{})
}

//+kubebuilder:object:root=true

// ElasticsearchILMPolicyList contains a list of ILMPolicy.
type ElasticsearchILMPolicyList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ElasticsearchILMPolicy `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// ElasticsearchILMPolicy is the Schema for the ILM Policy API.
type ElasticsearchILMPolicy struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ElasticsearchILMPolicySpec `json:"spec,omitempty"`
	Status Status                     `json:"status,omitempty"`
}

func (s *ElasticsearchILMPolicy) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

// ElasticsearchILMPolicySpec defines the desired state of ILMPolicy.
type ElasticsearchILMPolicySpec struct {
	CredentialsRef corev1.LocalObjectReference      `json:"credentialsRef"`
	Definition     ElasticsearchILMPolicyDefinition `json:"definition"`
}

// ElasticsearchILMPolicyDefinition is a representation of the elasticsearch ILM policy.
// See: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/index-lifecycle
type ElasticsearchILMPolicyDefinition struct {
	Policy runtime.RawExtension `json:"policy"`
}
