package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

type ElasticsearchIndexTemplateDefinition struct {
	IndexPatterns []string             `json:"indexPatterns"`
	Template      runtime.RawExtension `json:"template"`
}

// ElasticsearchIndexTemplateSpec defines the desired state of ElasticsearchIndexTemplate
type ElasticsearchIndexTemplateSpec struct {
	Name           *string                              `json:"name,omitempty"`
	CredentialsRef corev1.LocalObjectReference          `json:"credentialsRef"`
	Definition     ElasticsearchIndexTemplateDefinition `json:"definition"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ElasticsearchIndexTemplate is the Schema for the elasticsearchindextemplates API
type ElasticsearchIndexTemplate struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ElasticsearchIndexTemplateSpec `json:"spec,omitempty"`
	Status Status                         `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ElasticsearchIndexTemplateList contains a list of ElasticsearchIndexTemplate
type ElasticsearchIndexTemplateList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ElasticsearchIndexTemplate `json:"items"`
}

func (s *ElasticsearchIndexTemplate) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

func (s *ElasticsearchIndexTemplate) GetName() string {
	if s.Spec.Name != nil && len(*s.Spec.Name) > 0 {
		return *s.Spec.Name
	}
	return s.Name
}

func init() {
	SchemeBuilder.Register(&ElasticsearchIndexTemplate{}, &ElasticsearchIndexTemplateList{})
}
