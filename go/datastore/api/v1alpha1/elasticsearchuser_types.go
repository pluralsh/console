package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ElasticsearchUserSpec defines the desired state of ElasticsearchUser
type ElasticsearchUserSpec struct {
	CredentialsRef corev1.LocalObjectReference `json:"credentialsRef"`
	Definition     ElasticsearchUserDefinition `json:"definition"`
}

type ElasticsearchUserDefinition struct {
	// User to add
	User string `json:"user"`
	// PasswordSecretKeyRef reference
	PasswordSecretKeyRef corev1.SecretKeySelector `json:"passwordSecretKeyRef"`
	// Role represents the structure and assignment of roles in Elasticsearch.
	Role ElasticsearchRole `json:"role"`
}

type ElasticsearchRole struct {
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

// ElasticsearchUser is the Schema for the elasticsearchusers API
type ElasticsearchUser struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ElasticsearchUserSpec `json:"spec,omitempty"`
	Status Status                `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ElasticsearchUserList contains a list of ElasticsearchUser
type ElasticsearchUserList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ElasticsearchUser `json:"items"`
}

func (s *ElasticsearchUser) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

func init() {
	SchemeBuilder.Register(&ElasticsearchUser{}, &ElasticsearchUserList{})
}
