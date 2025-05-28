package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// ElasticSearchUserSpec defines the desired state of ElasticSearchUser
type ElasticSearchUserSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// Foo is an example field of ElasticSearchUser. Edit elasticsearchuser_types.go to remove/update
	Foo string `json:"foo,omitempty"`
}

// ElasticSearchUserStatus defines the observed state of ElasticSearchUser
type ElasticSearchUserStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ElasticSearchUser is the Schema for the elasticsearchusers API
type ElasticSearchUser struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ElasticSearchUserSpec   `json:"spec,omitempty"`
	Status ElasticSearchUserStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ElasticSearchUserList contains a list of ElasticSearchUser
type ElasticSearchUserList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ElasticSearchUser `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ElasticSearchUser{}, &ElasticSearchUserList{})
}
