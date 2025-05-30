package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ElasticsearchCredentialsSpec defines the desired state of ElasticsearchCredentials
type ElasticsearchCredentialsSpec struct {
	Insecure             *bool                    `json:"insecure,omitempty"`
	URL                  string                   `json:"url"`
	Username             string                   `json:"username"`
	PasswordSecretKeyRef corev1.SecretKeySelector `json:"passwordSecretKeyRef"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// ElasticsearchCredentials is the Schema for the elasticsearchcredentials API
type ElasticsearchCredentials struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ElasticsearchCredentialsSpec `json:"spec,omitempty"`
	Status Status                       `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ElasticsearchCredentialsList contains a list of ElasticsearchCredentials
type ElasticsearchCredentialsList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ElasticsearchCredentials `json:"items"`
}

func (s *ElasticsearchCredentials) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

func init() {
	SchemeBuilder.Register(&ElasticsearchCredentials{}, &ElasticsearchCredentialsList{})
}
