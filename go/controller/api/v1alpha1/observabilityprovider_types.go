package v1alpha1

import (
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&ObservabilityProvider{}, &ObservabilityProviderList{})
}

// ObservabilityProviderList contains a list of ObservabilityProvider.
// +kubebuilder:object:root=true
type ObservabilityProviderList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []ObservabilityProvider `json:"items"`
}

// ObservabilityProvider defines metrics provider used
// by i.e. InfrastructureStack to determine if a stack run
// should be cancelled.
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the ObservabilityProvider in the Console API."
type ObservabilityProvider struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// +kubebuilder:validation:Required
	Spec ObservabilityProviderSpec `json:"spec"`

	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

func (in *ObservabilityProvider) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

func (in *ObservabilityProvider) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *ObservabilityProvider) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *ObservabilityProvider) Attributes(credentials client.ObservabilityProviderCredentialsAttributes) client.ObservabilityProviderAttributes {
	return client.ObservabilityProviderAttributes{
		Name:        in.ConsoleName(),
		Type:        in.Spec.Type,
		Credentials: credentials,
	}
}

type ObservabilityProviderSpec struct {
	// Name of the ObservabilityProvider in the Console API.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Type of the ObservabilityProvider.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=DATADOG;NEWRELIC
	Type client.ObservabilityProviderType `json:"type"`

	// Credentials to access the configured provider Type.
	// +kubebuilder:validation:Required
	Credentials ObservabilityProviderCredentials `json:"credentials"`
}

type ObservabilityProviderCredentials struct {
	// Datadog is a reference to the secret with credentials used to access datadog.
	// It requires 2 keys to be provided in a secret:
	// - 'apiKey'
	// - 'appKey'
	// +kubebuilder:validation:Optional
	Datadog *v1.SecretReference `json:"datadog,omitempty"`

	// Newrelic is a reference to the secret with credentials used to access newrelic.
	// It requires 1 key to be provided in a secret:
	// - 'apiKey'
	// +kubebuilder:validation:Optional
	Newrelic *v1.SecretReference `json:"newrelic,omitempty"`
}
