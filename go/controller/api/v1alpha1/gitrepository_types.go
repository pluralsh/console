package v1alpha1

import (
	"github.com/pluralsh/console/go/controller/api/common"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&GitRepository{}, &GitRepositoryList{})
}

// GitRepositorySpec defines the desired state of the GitRepository resource.
type GitRepositorySpec struct {
	// Url of the GitRepository, supporting both HTTPS and SSH protocols.
	// This field is immutable once set.
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Url is immutable"
	Url string `json:"url"`

	// ConnectionRef references an ScmConnection to reuse existing credentials and configuration
	// for authenticating with GitRepository.
	// +kubebuilder:validation:Optional
	ConnectionRef *corev1.ObjectReference `json:"connectionRef,omitempty"`

	// CredentialsRef references a Secret containing authentication credentials for this repository.
	// The secret should contain keys for privateKey, passphrase, username, and password as needed
	// for the repository's authentication method.
	// +kubebuilder:validation:Optional
	CredentialsRef *corev1.SecretReference `json:"credentialsRef,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *common.Reconciliation `json:"reconciliation,omitempty"`
}

type GitHealth string

const (
	GitHealthPullable GitHealth = "PULLABLE"
	GitHealthFailed   GitHealth = "FAILED"
)

type GitRepositoryStatus struct {
	common.Status `json:",inline"`

	// Health status.
	// One of PULLABLE, FAILED.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum:=PULLABLE;FAILED
	Health GitHealth `json:"health,omitempty"`

	// Message indicating details about the last transition.
	// +kubebuilder:validation:Optional
	Message *string `json:"message,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Health",type="string",JSONPath=".status.health",description="Repo health status"
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console repo Id"

// GitRepository provides Git-based source control integration for Plural's GitOps workflows.
// It represents a Git repository available for deployments, enabling automated fetching of manifests,
// IaC code, and configuration from version-controlled sources. Supports both HTTPS and SSH authentication
// methods with health monitoring and credential management through ScmConnections or direct secret references.
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

// +kubebuilder:object:root=true

// GitRepositoryList contains a list of GitRepository resources.
type GitRepositoryList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []GitRepository `json:"items"`
}

func (in *GitRepository) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}
