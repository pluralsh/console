package v1alpha1

import (
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&Provider{}, &ProviderList{})
}

type CloudProvider string

const (
	AWS   CloudProvider = "aws"
	Azure CloudProvider = "azure"
	BYOK  CloudProvider = "byok"
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

// ProviderList ...
// +kubebuilder:object:root=true
type ProviderList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []Provider `json:"items"`
}

// ProviderSpec ...
// +kubebuilder:validation:Validation:rule="(self.cloud == 'byok' && !has(self.cloudSettings)) || (self.cloud != 'byok' && has(self.cloudSettings))",message="Cloud Settings must be provided only when Cloud is not set to BYOK."
type ProviderSpec struct {
	// Cloud is the name of the cloud service for the Provider.
	// One of (CloudProvider): [byok, gcp, aws, azure]
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

// ProviderStatus ...
type ProviderStatus struct {
	// ID of the provider in the Console API.
	// +kubebuilder:validation:Optional
	ID string `json:"id,omitempty"`
}
