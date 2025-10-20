package v1alpha1

import (
	"github.com/pluralsh/console/go/controller/api/common"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&BootstrapToken{}, &BootstrapTokenList{})
}

// +kubebuilder:object:root=true

// BootstrapTokenList contains a list of BootstrapToken resources.
type BootstrapTokenList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []BootstrapToken `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the BootstrapToken in the Console API."

// BootstrapToken is a restricted authentication token for secure cluster registration.
// It enables edge devices and new clusters to self-register with the Plural Console
// without exposing full user credentials. The token is scope-limited to cluster
// registration operations only and automatically assigns registered clusters to a
// specified project.
type BootstrapToken struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   BootstrapTokenSpec `json:"spec,omitempty"`
	Status common.Status      `json:"status,omitempty"`
}

// BootstrapTokenSpec defines the desired state of BootstrapToken
type BootstrapTokenSpec struct {
	// User is an optional email to attribute bootstrap token operations in audit logs.
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="User is immutable"
	// +kubebuilder:validation:Optional
	User *string `json:"user,omitempty"`

	// ProjectRef is the project that all clusters registered with this token will belong to.
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Project is immutable"
	// +kubebuilder:validation:Required
	ProjectRef v1.ObjectReference `json:"projectRef,omitempty"`

	// TokenSecretRef points to a secret where the generated bootstrap token will be stored.
	// The secret is created automatically and must not already exist when the BootstrapToken is created.
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Token secret is immutable"
	// +kubebuilder:validation:Required
	TokenSecretRef v1.SecretReference `json:"tokenSecretRef,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *common.Reconciliation `json:"reconciliation,omitempty"`
}

func (in *BootstrapToken) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// ConsoleID implements [PluralResource] interface
func (in *BootstrapToken) ConsoleID() *string {
	return in.Status.ID
}
