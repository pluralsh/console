package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&FederatedCredentialList{}, &FederatedCredential{})
}

// +kubebuilder:object:root=true

// FederatedCredentialList contains a list of FederatedCredential
type FederatedCredentialList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []FederatedCredential `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the FederatedCredential in the Console API."

// FederatedCredential is a way to authenticate users from an external identity provider.
type FederatedCredential struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   FederatedCredentialSpec `json:"spec,omitempty"`
	Status Status                  `json:"status,omitempty"`
}

// FederatedCredentialSpec defines the desired state of FederatedCredential.
type FederatedCredentialSpec struct {
	// Issuer is the URL of the identity provider that issues the tokens.
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Issuer is immutable"
	// +kubebuilder:validation:Required
	Issuer string `json:"issuer"`

	// Scopes are the scopes that the credential will request from the identity provider.
	// +kubebuilder:validation:Optional
	Scopes []string `json:"scopes,omitempty"`

	// ClaimsLike is a JSON expression that matches the claims in the token.
	// TODO: describe the syntax of this expression.
	// +kubebuilder:validation:Optional
	ClaimsLike *string `json:"claimsLike,omitempty"`

	// User is the user email address that will be authenticated by this credential.
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="User is immutable"
	// +kubebuilder:validation:Optional
	User string `json:"user"`
}
