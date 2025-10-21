/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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

//+kubebuilder:object:root=true

// OIDCProviderList contains a list of OIDCProvider resources.
type OIDCProviderList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []OIDCProvider `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the OIDCProvider in the Console API"

// OIDCProvider configures OpenID Connect (OIDC) authentication for external applications and services.
// It enables third-party applications to authenticate users through the Plural Console using the standard
// OIDC protocol. This is useful for integrating external tools, dashboards, or custom applications with
// Plural's authentication system while maintaining centralized user management and access control.
// Common use cases include connecting monitoring dashboards, CI/CD tools, or custom applications that
// need to authenticate users against the Plural Console's user directory.
type OIDCProvider struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the OIDCProvider, including authentication settings,
	// redirect URIs, and credential management for OIDC client configuration.
	Spec OIDCProviderSpec `json:"spec,omitempty"`

	// Status represents the current state of this OIDCProvider resource, including
	// synchronization status with the Console API and generated client credentials.
	Status Status `json:"status,omitempty"`
}

// ConsoleName returns the effective name to be used for this OIDC provider.
// It returns the explicitly configured name if provided, otherwise falls back to
// the OIDCProvider resource's own name from metadata.
func (in *OIDCProvider) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

// SetCondition sets a condition on the OIDCProvider status.
func (in *OIDCProvider) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// Diff compares the current OIDCProvider configuration with its last known state to determine
// if changes have occurred. It returns whether the resource has changed, the new SHA hash,
// and any error that occurred during comparison.
func (in *OIDCProvider) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// Attributes converts the OIDCProvider spec to Console API attributes for upstream synchronization.
func (in *OIDCProvider) Attributes() console.OidcProviderAttributes {
	result := console.OidcProviderAttributes{
		Name:         in.ConsoleName(),
		Description:  in.Spec.Description,
		RedirectUris: lo.ToSlicePtr(in.Spec.RedirectUris),
	}

	return result
}

// OIDCProviderSpec defines the desired state of OIDCProvider.
// It specifies the OIDC client configuration including redirect URIs, authentication methods,
// and credential storage for enabling third-party applications to authenticate with Plural Console.
type OIDCProviderSpec struct {
	// Name specifies the name for this OIDC provider.
	// If not provided, the name from the resource metadata will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Description provides a human-readable description of this OIDC provider.
	// This helps administrators understand the purpose and intended use of this OIDC client,
	// such as which application or service it's configured for.
	// +kubebuilder:validation:Optional
	Description *string `json:"description,omitempty"`

	// RedirectUris specifies the list of allowed redirect URIs for this OIDC client.
	// These URIs define where the authorization server can redirect users after authentication.
	// Each URI must be an exact match to be considered valid during the OIDC flow.
	// Common patterns include application callback URLs or localhost URLs for development.
	// +kubebuilder:validation:Optional
	RedirectUris []string `json:"redirectUris,omitempty"`

	// CredentialsSecretRef references a Kubernetes Secret that will contain the generated OIDC client credentials.
	// Once the OIDCProvider is successfully created in the Console API, this secret will be populated
	// with the client ID and client secret needed for OIDC authentication flows.
	// The secret will contain two keys: 'clientId' and 'clientSecret'.
	// +kubebuilder:validation:Required
	CredentialsSecretRef corev1.LocalObjectReference `json:"credentialsSecretRef"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}
