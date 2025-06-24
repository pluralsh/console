package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// MySqlCredentialsSpec defines the desired state of MySqlCredentials
type MySqlCredentialsSpec struct {
	Host                 string                   `json:"host"`
	Port                 int                      `json:"port"`
	Username             string                   `json:"username"`
	PasswordSecretKeyRef corev1.SecretKeySelector `json:"passwordSecretKeyRef"`
	Insecure             *bool                    `json:"insecure,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// MySqlCredentials is the Schema for the mysqlcredentials API
type MySqlCredentials struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MySqlCredentialsSpec `json:"spec,omitempty"`
	Status Status               `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// MySqlCredentialsList contains a list of MySqlCredentials
type MySqlCredentialsList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MySqlCredentials `json:"items"`
}

func (s *MySqlCredentials) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

func init() {
	SchemeBuilder.Register(&MySqlCredentials{}, &MySqlCredentialsList{})
}
