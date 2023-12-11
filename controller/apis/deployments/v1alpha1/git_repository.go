package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&GitRepository{}, &GitRepositoryList{})
}

type GitRepositorySpec struct {
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Url is immutable"
	Url string `json:"url"`

	// CredentialsRef is a secret reference which should contain privateKey, passphrase, username and password.
	// +optional
	CredentialsRef *corev1.SecretReference `json:"credentialsRef,omitempty"`
}

type GitHealth string

const (
	GitHealthPullable GitHealth = "PULLABLE"
	GitHealthFailed   GitHealth = "FAILED"
)

type GitRepositoryStatus struct {
	// Health status.
	// +optional
	// +kubebuilder:validation:Enum:=PULLABLE;FAILED
	Health GitHealth `json:"health,omitempty"`
	// Message indicating details about last transition.
	// +optional
	Message *string `json:"message,omitempty"`
	// Id of repo in console.
	// +optional
	Id *string `json:"id,omitempty"`
	// +optional
	Sha string `json:"sha,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Health",type="string",JSONPath=".status.health",description="Repo health status"
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console repo Id"
type GitRepository struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   GitRepositorySpec   `json:"spec,omitempty"`
	Status GitRepositoryStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

type GitRepositoryList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []GitRepository `json:"items"`
}
