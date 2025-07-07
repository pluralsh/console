package v1alpha1

import (
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&OIDCProvider{}, &OIDCProviderList{})
}

// OIDCProviderList contains a list of OIDCProvider
// +kubebuilder:object:root=true
type OIDCProviderList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []OIDCProvider `json:"items"`
}

// OIDCProvider is the Schema for the OIDCProviders API
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the OIDCProvider in the Console API."
type OIDCProvider struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   OIDCProviderSpec `json:"spec,omitempty"`
	Status Status           `json:"status,omitempty"`
}

func (in *OIDCProvider) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

func (in *OIDCProvider) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *OIDCProvider) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *OIDCProvider) Attributes() console.OidcProviderAttributes {
	result := console.OidcProviderAttributes{
		Name:         in.ConsoleName(),
		Description:  in.Spec.Description,
		RedirectUris: lo.ToSlicePtr(in.Spec.RedirectUris),
	}

	return result
}

// OIDCProviderSpec defines the desired state of OIDCProvider
type OIDCProviderSpec struct {
	// Name of this OIDCProvider. If not provided OIDCProvider's own name
	// from OIDCProvider.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Description can be used to describe this OIDCProvider.
	// +kubebuilder:validation:Optional
	Description *string `json:"description,omitempty"`

	// RedirectUris is a list of custom run steps that will be executed as
	// part of the stack run.
	// +kubebuilder:validation:Optional
	RedirectUris []string `json:"redirectUris,omitempty"`

	// CredentialsSecretRef is a local reference to the secret that contains OIDC provider credentials.
	// It will be created once OIDCProvider is created in the Console API.
	//
	// Secret will contain 2 keys:
	// - 'clientId'
	// - 'clientSecret'
	//
	// +kubebuilder:validation:Required
	CredentialsSecretRef corev1.LocalObjectReference `json:"credentialsSecretRef"`
}
