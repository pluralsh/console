package v1alpha1

import (
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&BootstrapToken{}, &BootstrapTokenList{})
}

// BootstrapTokenList contains a list of BootstrapToken
// +kubebuilder:object:root=true
type BootstrapTokenList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []BootstrapToken `json:"items"`
}

// BootstrapToken is the Schema for the BootstrapTokens API
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the BootstrapToken in the Console API."
type BootstrapToken struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   BootstrapTokenSpec `json:"spec,omitempty"`
	Status Status             `json:"status,omitempty"`
}

// BootstrapTokenSpec defines the desired state of BootstrapToken
type BootstrapTokenSpec struct {
	// User is an optional email to the user identity for this bootstrap token in audit logs
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="User is immutable"
	// +kubebuilder:validation:Optional
	User *string `json:"userID,omitempty"`

	// ProjectRef is the optional project that all clusters spawned by generated bootstrap token will belong to
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Project is immutable"
	// +kubebuilder:validation:Required
	ProjectRef v1.ObjectReference `json:"projectRef,omitempty"`

	// TokenSecretRef points to an output secret where bootstrap token will be stored.
	// It will be created automatically in the same namespace as BootstrapToken and cannot exist.
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Token secret is immutable"
	// +kubebuilder:validation:Required
	TokenSecretRef v1.SecretReference `json:"tokenSecretRef,omitempty"`
}

func (in *BootstrapToken) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// ConsoleID implements [PluralResource] interface
func (in *BootstrapToken) ConsoleID() *string {
	return in.Status.ID
}
