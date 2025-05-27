package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// ElasticSearchCredentialsSpec defines the desired state of ElasticSearchCredentials
type ElasticSearchCredentialsSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// Foo is an example field of ElasticSearchCredentials. Edit elasticsearchcredentials_types.go to remove/update
	Foo string `json:"foo,omitempty"`
}

// ElasticSearchCredentialsStatus defines the observed state of ElasticSearchCredentials
type ElasticSearchCredentialsStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ElasticSearchCredentials is the Schema for the elasticsearchcredentials API
type ElasticSearchCredentials struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ElasticSearchCredentialsSpec   `json:"spec,omitempty"`
	Status ElasticSearchCredentialsStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ElasticSearchCredentialsList contains a list of ElasticSearchCredentials
type ElasticSearchCredentialsList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ElasticSearchCredentials `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ElasticSearchCredentials{}, &ElasticSearchCredentialsList{})
}
