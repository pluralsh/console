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
	// ID of the provider in the Console API.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ID *string `json:"id,omitempty"`
	// SHA of last applied configuration.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	SHA *string `json:"sha,omitempty"`
	// Represents the observations of Repository current state.
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
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

func (p *GitRepositoryStatus) HasReadonlyCondition() bool {
	return meta.FindStatusCondition(p.Conditions, ReadonlyConditionType.String()) != nil
}

func (p *GitRepositoryStatus) IsReadonly() bool {
	return meta.IsStatusConditionTrue(p.Conditions, ReadonlyConditionType.String())
}

func (p *GitRepositoryStatus) IsSHAEqual(sha string) bool {
	if !p.HasSHA() {
		return false
	}

	return p.GetSHA() == sha
}

func (p *GitRepositoryStatus) GetSHA() string {
	if !p.HasSHA() {
		return ""
	}

	return *p.SHA
}

func (p *GitRepositoryStatus) HasSHA() bool {
	return p.SHA != nil && len(*p.SHA) > 0
}

func (p *GitRepositoryStatus) GetID() string {
	if !p.HasID() {
		return ""
	}

	return *p.ID
}

func (p *GitRepositoryStatus) HasID() bool {
	return p.ID != nil && len(*p.ID) > 0
}

func (p *GitRepository) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}
