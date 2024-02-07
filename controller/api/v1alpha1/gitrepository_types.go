package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&GitRepository{}, &GitRepositoryList{})
}

type GitRepositorySpec struct {
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Url is immutable"
	Url string `json:"url"`

	// CredentialsRef is a secret reference which should contain privateKey, passphrase, username and password.
	// +kubebuilder:validation:Optional
	CredentialsRef *corev1.SecretReference `json:"credentialsRef,omitempty"`
}

type GitHealth string

const (
	GitHealthPullable GitHealth = "PULLABLE"
	GitHealthFailed   GitHealth = "FAILED"
)

type GitRepositoryStatus struct {
	Status `json:",inline"`

	// Health status.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum:=PULLABLE;FAILED
	Health GitHealth `json:"health,omitempty"`
	// Message indicating details about last transition.
	// +kubebuilder:validation:Optional
	Message *string `json:"message,omitempty"`
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

// ConsoleID implements PluralResource interface
func (in *GitRepository) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName implements PluralResource interface
func (in *GitRepository) ConsoleName() string {
	return in.Name
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

type GitRepositoryList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []GitRepository `json:"items"`
}

func (in *GitRepository) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}
