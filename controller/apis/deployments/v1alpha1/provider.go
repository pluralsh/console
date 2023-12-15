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
type CloudSettingsGetter func(context.Context, Provider) (*console.CloudProviderSettingsAttributes, error)

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

func (p *Provider) Attributes(ctx context.Context, cloudSettingsGetter CloudSettingsGetter) (console.ClusterProviderAttributes, error) {
	cloudSettings, err := cloudSettingsGetter(ctx, *p)
	return console.ClusterProviderAttributes{
		Name:          p.Spec.Name,
		Namespace:     &p.Spec.Namespace,
		Cloud:         p.Spec.Cloud.Attribute(),
		CloudSettings: cloudSettings,
	}, err
}

func (p *Provider) UpdateAttributes(ctx context.Context, cloudSettingsGetter CloudSettingsGetter) (console.ClusterProviderUpdateAttributes, error) {
	cloudSettings, err := cloudSettingsGetter(ctx, *p)
	return console.ClusterProviderUpdateAttributes{
		CloudSettings: cloudSettings,
	}, err
}

func (p *Provider) Diff(ctx context.Context, getter CloudSettingsGetter, hasher Hasher) (changed bool, sha string, err error) {
	cloudSettings, err := getter(ctx, *p)
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
type ProviderSpec struct {
	// Cloud is the name of the cloud service for the Provider.
	// One of (CloudProvider): [gcp, aws, azure]
	// +kubebuilder:example:=aws
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=gcp;aws;azure
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Cloud is immutable"
	Cloud CloudProvider `json:"cloud"`
	// CloudSettings reference cloud provider credentials secrets used for provisioning the Cluster.
	// Not required when Cloud is set to CloudProvider(BYOK).
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=object
	// +structType=atomic
	CloudSettings *CloudProviderSettings `json:"cloudSettings"`
	// Name is a human-readable name of the Provider.
	// +kubebuilder:example:=gcp-provider
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Name is immutable"
	Name string `json:"name"`
	// Namespace is the namespace ClusterAPI resources are deployed into.
	// +kubebuilder:example:=capi-gcp
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Namespace is immutable"
	Namespace string `json:"namespace,omitempty"`
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
	// Existing flag is set to true when Console API object already exists when CRD is created.
	// CRD is then set to read-only mode and does not update Console API from CRD.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=boolean
	Existing *bool `json:"existing,omitempty"`
	// Represents the observations of a Provider's current state.
	// Known .status.conditions.type are: "Available", "Progressing", and "Degraded"
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
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

func (p *ProviderStatus) HasExisting() bool {
	return p.Existing != nil
}
