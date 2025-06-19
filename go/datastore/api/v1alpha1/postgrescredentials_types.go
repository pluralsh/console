package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// PostgresCredentialsSpec defines the desired state of PostgresCredentials
type PostgresCredentialsSpec struct {
	Host                 string                   `json:"host"`
	Port                 int                      `json:"port"`
	Database             string                   `json:"database"`
	Username             string                   `json:"username"`
	PasswordSecretKeyRef corev1.SecretKeySelector `json:"passwordSecretKeyRef"`
	Insecure             *bool                    `json:"insecure,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// PostgresCredentials is the Schema for the postgrescredentials API
type PostgresCredentials struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PostgresCredentialsSpec `json:"spec,omitempty"`
	Status Status                  `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// PostgresCredentialsList contains a list of PostgresCredentials
type PostgresCredentialsList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PostgresCredentials `json:"items"`
}

func (p *PostgresCredentials) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

func init() {
	SchemeBuilder.Register(&PostgresCredentials{}, &PostgresCredentialsList{})
}
