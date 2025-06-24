package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// MySqlCredentialsSpec defines the desired state of MySqlCredentials
type MySqlCredentialsSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// Foo is an example field of MySqlCredentials. Edit mysqlcredentials_types.go to remove/update
	Foo string `json:"foo,omitempty"`
}

// MySqlCredentialsStatus defines the observed state of MySqlCredentials
type MySqlCredentialsStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// MySqlCredentials is the Schema for the mysqlcredentials API
type MySqlCredentials struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MySqlCredentialsSpec   `json:"spec,omitempty"`
	Status MySqlCredentialsStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// MySqlCredentialsList contains a list of MySqlCredentials
type MySqlCredentialsList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MySqlCredentials `json:"items"`
}

func init() {
	SchemeBuilder.Register(&MySqlCredentials{}, &MySqlCredentialsList{})
}
