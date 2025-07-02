package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// MySqlUserSpec defines the desired state of MySqlUser
type MySqlUserSpec struct {
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	CredentialsRef corev1.LocalObjectReference `json:"credentialsRef"`

	Databases []string `json:"databases,omitempty"`

	// PasswordSecretKeyRef reference
	PasswordSecretKeyRef corev1.SecretKeySelector `json:"passwordSecretKeyRef"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// MySqlUser is the Schema for the mysqlusers API
type MySqlUser struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MySqlUserSpec `json:"spec,omitempty"`
	Status Status        `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// MySqlUserList contains a list of MySqlUser
type MySqlUserList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MySqlUser `json:"items"`
}

func (s *MySqlUser) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

func (s *MySqlUser) UserName() string {
	if s.Spec.Name != nil {
		return *s.Spec.Name
	}

	return s.Name
}

func init() {
	SchemeBuilder.Register(&MySqlUser{}, &MySqlUserList{})
}
