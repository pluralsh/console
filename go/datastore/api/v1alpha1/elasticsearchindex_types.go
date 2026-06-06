package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

func init() {
	SchemeBuilder.Register(&ElasticsearchIndex{}, &ElasticsearchIndexList{})
}

//+kubebuilder:object:root=true

// ElasticsearchIndexList contains a list of ElasticsearchIndex.
type ElasticsearchIndexList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ElasticsearchIndex `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// ElasticsearchIndex is the Schema for the Elasticsearch index API.
type ElasticsearchIndex struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ElasticsearchIndexSpec `json:"spec,omitempty"`
	Status Status                 `json:"status,omitempty"`
}

func (in *ElasticsearchIndex) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *ElasticsearchIndex) ResourceName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

// ElasticsearchIndexSpec defines the desired state of ElasticsearchIndex.
type ElasticsearchIndexSpec struct {
	CredentialsRef corev1.LocalObjectReference `json:"credentialsRef"`

	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Definition of the Elasticsearch index, including settings, mappings, and aliases.
	// See: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create
	// +kubebuilder:validation:Required
	Definition runtime.RawExtension `json:"definition"`
}
