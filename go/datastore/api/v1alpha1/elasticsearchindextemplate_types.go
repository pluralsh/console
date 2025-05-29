package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// ElasticSearchIndexTemplateSpec defines the desired state of ElasticSearchIndexTemplate
type ElasticSearchIndexTemplateSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// Foo is an example field of ElasticSearchIndexTemplate. Edit elasticsearchindextemplate_types.go to remove/update
	Foo string `json:"foo,omitempty"`
}

// ElasticSearchIndexTemplateStatus defines the observed state of ElasticSearchIndexTemplate
type ElasticSearchIndexTemplateStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ElasticSearchIndexTemplate is the Schema for the elasticsearchindextemplates API
type ElasticSearchIndexTemplate struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ElasticSearchIndexTemplateSpec   `json:"spec,omitempty"`
	Status ElasticSearchIndexTemplateStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ElasticSearchIndexTemplateList contains a list of ElasticSearchIndexTemplate
type ElasticSearchIndexTemplateList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ElasticSearchIndexTemplate `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ElasticSearchIndexTemplate{}, &ElasticSearchIndexTemplateList{})
}
