package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// PostgresUserSpec defines the desired state of PostgresUser
type PostgresUserSpec struct {
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	CredentialsRef corev1.LocalObjectReference `json:"credentialsRef"`

	Databases []string `json:"databases,omitempty"`

	// PasswordSecretKeyRef reference
	PasswordSecretKeyRef corev1.SecretKeySelector `json:"passwordSecretKeyRef"`
}

// PostgresUserStatus defines the observed state of PostgresUser
type PostgresUserStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// PostgresUser is the Schema for the postgresusers API
type PostgresUser struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PostgresUserSpec `json:"spec,omitempty"`
	Status Status           `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// PostgresUserList contains a list of PostgresUser
type PostgresUserList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PostgresUser `json:"items"`
}

func init() {
	SchemeBuilder.Register(&PostgresUser{}, &PostgresUserList{})
}

func (p *PostgresUser) UserName() string {
	if p.Spec.Name != nil {
		return *p.Spec.Name
	}

	return p.Name
}

func (p *PostgresUser) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}
