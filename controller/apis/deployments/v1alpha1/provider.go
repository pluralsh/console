package v1alpha1

import (
	"context"

	console "github.com/pluralsh/console-client-go"
	"github.com/samber/lo"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&Provider{}, &ProviderList{})
}

// CloudSettingsGetter is just a helper function that can be implemented to properly
// build Console API attributes
// +kubebuilder:object:generate:=false
type CloudSettingsGetter func(context.Context, ProviderSpec) (*console.CloudProviderSettingsAttributes, error)

// Hasher
// +kubebuilder:object:generate:=false
type Hasher func(interface{}) (string, error)

type CloudProvider string

func (c CloudProvider) Attribute() *string {
	return lo.ToPtr(string(c))
}

const (
	AWS   CloudProvider = "aws"
	Azure CloudProvider = "azure"
	GCP   CloudProvider = "gcp"
)

// CloudProviderSettings ...
type CloudProviderSettings struct {
	// +kubebuilder:validation:Optional
	AWS *v1.SecretReference `json:"aws,omitempty"`
	// +kubebuilder:validation:Optional
	Azure *v1.SecretReference `json:"azure,omitempty"`
	// +kubebuilder:validation:Optional
	GCP *v1.SecretReference `json:"gcp,omitempty"`
}

// Provider ...
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the provider in the Console API."
// +kubebuilder:printcolumn:name="Name",type="string",JSONPath=".spec.name",description="Human-readable name of the Provider."
// +kubebuilder:printcolumn:name="Cloud",type="string",JSONPath=".spec.cloud",description="Name of the Provider cloud service."
type Provider struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// +kubebuilder:validation:Required
	Spec ProviderSpec `json:"spec"`
	// +kubebuilder:validation:Optional
	Status ProviderStatus `json:"status,omitempty"`
}

func (p *Provider) GetStatus() ProviderStatus {
	return p.Status
}

func (p *Provider) Diff(ctx context.Context, getter CloudSettingsGetter, hasher Hasher) (changed bool, sha string, err error) {
	cloudSettings, err := getter(ctx, p.Spec)
	if err != nil {
		return false, "", err
	}

	currentSha, err := hasher(cloudSettings)
	if err != nil {
		return false, "", err
	}

	return !p.Status.IsSHAEqual(currentSha), currentSha, nil
}

// ProviderList ...
// +kubebuilder:object:root=true
type ProviderList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []Provider `json:"items"`
}

// ProviderSpec ...
// +kubebuilder:validation:Validation:rule="(self.cloud == 'aws' && has(self.cloudSettings.aws)) || (self.cloud == 'gcp' && has(self.cloudSettings.gcp)) || (self.cloud == 'azure' && has(self.cloudSettings.azure))",message="Cloud Settings must be provided only for matching Cloud."
type ProviderSpec struct {
	// Cloud is the name of the cloud service for the Provider.
	// One of (CloudProvider): [gcp, aws, azure]
	// +kubebuilder:example:=byok
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=byok;gcp;aws;azure
	// +kubebuilder:validation:Validation:rule="self == oldSelf",message="Cloud is immutable"
	Cloud CloudProvider `json:"cloud"`
	// CloudSettings reference cloud provider credentials secrets used for provisioning the Cluster.
	// Not required when Cloud is set to CloudProvider(BYOK).
	// +kubebuilder:validation:Optional
	// +structType=atomic
	CloudSettings *CloudProviderSettings `json:"cloudSettings,omitempty"`
	// Name is a human-readable name of the Provider.
	// +kubebuilder:example:=gcp-provider
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Validation:rule="self == oldSelf",message="Name is immutable"
	Name string `json:"name"`
	// Namespace is the namespace ClusterAPI resources are deployed into.
	// +kubebuilder:example:=capi-gcp
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Validation:rule="self == oldSelf",message="Namespace is immutable"
	Namespace string `json:"namespace,omitempty"`
}

func (p *ProviderSpec) Attributes(ctx context.Context, cloudSettingsGetter CloudSettingsGetter) (console.ClusterProviderAttributes, error) {
	cloudSettings, err := cloudSettingsGetter(ctx, *p)
	return console.ClusterProviderAttributes{
		Name:          p.Name,
		Namespace:     &p.Namespace,
		Cloud:         p.Cloud.Attribute(),
		CloudSettings: cloudSettings,
	}, err
}

func (p *ProviderSpec) UpdateAttributes(ctx context.Context, cloudSettingsGetter CloudSettingsGetter) (console.ClusterProviderUpdateAttributes, error) {
	cloudSettings, err := cloudSettingsGetter(ctx, *p)
	return console.ClusterProviderUpdateAttributes{
		CloudSettings: cloudSettings,
	}, err
}

// ProviderStatus ...
type ProviderStatus struct {
	// ID of the provider in the Console API.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ID *string `json:"id,omitempty"`
	// SHA of last applied configuration.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	SHA *string `json:"sha,omitempty"`
	// Existing flag.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Existing *string `json:"existing,omitempty"`
}

func (p *ProviderStatus) GetID() string {
	if !p.HasID() {
		return ""
	}

	return *p.ID
}

func (p *ProviderStatus) HasID() bool {
	return p.ID != nil && len(*p.ID) > 0
}

func (p *ProviderStatus) GetSHA() string {
	if !p.HasSHA() {
		return ""
	}

	return *p.SHA
}

func (p *ProviderStatus) HasSHA() bool {
	return p.SHA != nil && len(*p.SHA) > 0
}

func (p *ProviderStatus) IsSHAEqual(sha string) bool {
	if !p.HasSHA() {
		return false
	}

	return p.GetSHA() == sha
}
