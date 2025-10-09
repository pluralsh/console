package v1alpha1

import (
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"

	console "github.com/pluralsh/console/go/client"
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

func (in *FederatedCredential) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *FederatedCredential) Attributes(userID string) console.FederatedCredentialAttributes {
	var claimsLike *string
	if in.Spec.ClaimsLike == nil || len(in.Spec.ClaimsLike.Raw) == 0 {
		// If claimsLike is not set, we default to an empty JSON object.
		// This is to ensure that the API can handle it gracefully.
		claimsLike = lo.ToPtr("{}")
	} else {
		claimsLike = lo.ToPtr(string(in.Spec.ClaimsLike.Raw))
	}

	return console.FederatedCredentialAttributes{
		Issuer:     in.Spec.Issuer,
		Scopes:     lo.ToSlicePtr(in.Spec.Scopes),
		ClaimsLike: claimsLike,
		UserID:     userID,
	}
}

func (in *FederatedCredential) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// FederatedCredentialSpec defines the desired state of FederatedCredential.
type FederatedCredentialSpec struct {
	// Issuer is the URL of the identity provider that issues the tokens.
	// +kubebuilder:validation:Required
	Issuer string `json:"issuer"`

	// Scopes are the scopes that the credential will request from the identity provider.
	// +kubebuilder:validation:Optional
	Scopes []string `json:"scopes,omitempty"`

	// ClaimsLike is a JSON expression that matches the claims in the token.
	// All the value strings should be a valid regular expression.
	//
	// Example:
	// 	...
	//	claimsLike:
	//		sub: "repo:myaccount/myrepo:ref:refs/heads/.*"
	//
	// +kubebuilder:validation:Optional
	ClaimsLike *runtime.RawExtension `json:"claimsLike,omitempty"`

	// User is the user email address that will be authenticated by this credential.
	// +kubebuilder:validation:Required
	User string `json:"user"`
}
