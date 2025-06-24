package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// MySqlUserSpec defines the desired state of MySqlUser
type MySqlUserSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// Foo is an example field of MySqlUser. Edit mysqluser_types.go to remove/update
	Foo string `json:"foo,omitempty"`
}

// MySqlUserStatus defines the observed state of MySqlUser
type MySqlUserStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// MySqlUser is the Schema for the mysqlusers API
type MySqlUser struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MySqlUserSpec   `json:"spec,omitempty"`
	Status MySqlUserStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// MySqlUserList contains a list of MySqlUser
type MySqlUserList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MySqlUser `json:"items"`
}

func init() {
	SchemeBuilder.Register(&MySqlUser{}, &MySqlUserList{})
}
