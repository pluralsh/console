package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ElasticSearchCredentialsSpec defines the desired state of ElasticSearchCredentials
type ElasticSearchCredentialsSpec struct {
	URL                  string                   `json:"url"`
	Username             string                   `json:"username"`
	PasswordSecretKeyRef corev1.SecretKeySelector `json:"passwordSecretKeyRef"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// ElasticSearchCredentials is the Schema for the elasticsearchcredentials API
type ElasticSearchCredentials struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ElasticSearchCredentialsSpec `json:"spec,omitempty"`
	Status Status                       `json:"status,omitempty"`
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
