package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

type ElasticSearchIndexTemplateDefinition struct {
	IndexPatterns []string             `json:"indexPatterns"`
	Template      runtime.RawExtension `json:"template"`
}

// ElasticSearchIndexTemplateSpec defines the desired state of ElasticSearchIndexTemplate
type ElasticSearchIndexTemplateSpec struct {
	Name           string                               `json:"name"`
	CredentialsRef corev1.LocalObjectReference          `json:"credentialsRef"`
	Definition     ElasticSearchIndexTemplateDefinition `json:"definition"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ElasticSearchIndexTemplate is the Schema for the elasticsearchindextemplates API
type ElasticSearchIndexTemplate struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ElasticSearchIndexTemplateSpec `json:"spec,omitempty"`
	Status Status                         `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ElasticSearchIndexTemplateList contains a list of ElasticSearchIndexTemplate
type ElasticSearchIndexTemplateList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ElasticSearchIndexTemplate `json:"items"`
}

func (s *ElasticSearchIndexTemplate) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

func init() {
	SchemeBuilder.Register(&ElasticSearchIndexTemplate{}, &ElasticSearchIndexTemplateList{})
}
