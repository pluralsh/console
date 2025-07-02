package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// MySqlDatabaseSpec defines the desired state of MySqlDatabase
type MySqlDatabaseSpec struct {
	CredentialsRef corev1.LocalObjectReference `json:"credentialsRef"`

	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// MySqlDatabase is the Schema for the mysqldatabases API
type MySqlDatabase struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MySqlDatabaseSpec `json:"spec,omitempty"`
	Status Status            `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// MySqlDatabaseList contains a list of MySqlDatabase
type MySqlDatabaseList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MySqlDatabase `json:"items"`
}

func (s *MySqlDatabase) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

func (s *MySqlDatabase) DatabaseName() string {
	if s.Spec.Name != nil {
		return *s.Spec.Name
	}

	return s.Name
}

func init() {
	SchemeBuilder.Register(&MySqlDatabase{}, &MySqlDatabaseList{})
}
