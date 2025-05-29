package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ElasticSearchUserSpec defines the desired state of ElasticSearchUser
type ElasticSearchUserSpec struct {
	CredentialsRef corev1.LocalObjectReference `json:"credentialsRef"`
	Definition     Definition                  `json:"definition"`
}

type Definition struct {
	// User to add
	User string `json:"user"`
	// PasswordSecretKeyRef reference
	PasswordSecretKeyRef corev1.SecretKeySelector `json:"passwordSecretKeyRef"`
	// Role represents the structure and assignment of roles in Elasticsearch.
	Role ElasticSearchRole `json:"role"`
}

type ElasticSearchRole struct {
	Name               string            `json:"name"`
	ClusterPermissions []string          `json:"clusterPermissions,omitempty"`
	IndexPermissions   []IndexPermission `json:"indexPermissions,omitempty"`
}

type IndexPermission struct {
	Names      []string `json:"names"`
	Privileges []string `json:"privileges"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// ElasticSearchUser is the Schema for the elasticsearchusers API
type ElasticSearchUser struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ElasticSearchUserSpec `json:"spec,omitempty"`
	Status Status                `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ElasticSearchUserList contains a list of ElasticSearchUser
type ElasticSearchUserList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ElasticSearchUser `json:"items"`
}

func (s *ElasticSearchUser) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

func init() {
	SchemeBuilder.Register(&ElasticSearchUser{}, &ElasticSearchUserList{})
}
