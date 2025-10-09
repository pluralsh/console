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
	"context"

	"github.com/samber/lo"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&Provider{}, &ProviderList{})
}

// CloudSettingsGetter is a helper function interface that can be implemented to properly
// build Console API attributes for cloud provider settings. It takes a context and Provider
// and returns the cloud settings attributes needed for Console API integration, allowing
// for dynamic credential resolution and validation at runtime.
// +kubebuilder:object:generate:=false
type CloudSettingsGetter func(context.Context, Provider) (*console.CloudProviderSettingsAttributes, error)

// Hasher provides a function interface for generating hash values from objects
// to enable drift detection and state comparison for Provider resources.
// +kubebuilder:object:generate:=false
type Hasher func(interface{}) (string, error)

// CloudProvider represents the supported cloud service providers for cluster provisioning.
// This type defines which cloud platforms can be used for deploying and managing
// Kubernetes clusters through the Plural Console CAPI integration.
type CloudProvider string

// Attribute converts the CloudProvider to a string pointer for Console API integration.
func (c CloudProvider) Attribute() *string {
	return lo.ToPtr(string(c))
}

const (
	// AWS represents Amazon Web Services as a cloud provider
	AWS CloudProvider = "aws"
	// Azure represents Microsoft Azure as a cloud provider
	Azure CloudProvider = "azure"
	// GCP represents Google Cloud Platform as a cloud provider
	GCP CloudProvider = "gcp"
)

//+kubebuilder:object:root=true

// ProviderList contains a list of Provider resources.
type ProviderList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []Provider `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:resource:scope=Cluster
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the Provider in the Console API"

// Provider configures cloud provider integration for Kubernetes cluster provisioning using Cluster API (CAPI).
// It defines cloud-specific settings, credentials, and configuration needed to provision and manage
// Kubernetes clusters on cloud platforms like AWS, Azure, or Google Cloud Platform.
type Provider struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the Provider, including cloud provider type,
	// credentials configuration, and namespace settings for CAPI resource deployment.
	// +kubebuilder:validation:Required
	Spec ProviderSpec `json:"spec"`

	// Status represents the current state of this Provider resource, including
	// synchronization status with the Console API and cloud provider connectivity.
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// Attributes converts the Provider spec to Console API attributes for cluster provider creation.
func (p *Provider) Attributes(ctx context.Context, cloudSettingsGetter CloudSettingsGetter) (console.ClusterProviderAttributes, error) {
	cloudSettings, err := cloudSettingsGetter(ctx, *p)
	return console.ClusterProviderAttributes{
		Name:          p.Spec.Name,
		Namespace:     &p.Spec.Namespace,
		Cloud:         p.Spec.Cloud.Attribute(),
		CloudSettings: cloudSettings,
	}, err
}

// UpdateAttributes converts the Provider spec to Console API attributes for cluster provider updates.
func (p *Provider) UpdateAttributes(ctx context.Context, cloudSettingsGetter CloudSettingsGetter) (console.ClusterProviderUpdateAttributes, error) {
	cloudSettings, err := cloudSettingsGetter(ctx, *p)
	return console.ClusterProviderUpdateAttributes{
		CloudSettings: cloudSettings,
	}, err
}

// Diff compares the current Provider configuration with its last known state to determine
// if changes have occurred. It returns whether the resource has changed, the new SHA hash,
// and any error that occurred during comparison.
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

// SetCondition sets a condition on the Provider status.
func (p *Provider) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

// ProviderSpec defines the desired state of Provider.
// It specifies the cloud provider configuration, credentials, and deployment settings
// needed for provisioning and managing Kubernetes clusters through Cluster API.
type ProviderSpec struct {
	// Cloud specifies the name of the cloud service for this Provider.
	// This determines which cloud platform will be used for cluster provisioning
	// and must match one of the supported cloud providers: aws, gcp, or azure.
	// The cloud provider selection affects available features, instance types, and
	// networking options for clusters created with this provider.
	// +kubebuilder:example:=aws
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=gcp;aws;azure
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Cloud is immutable"
	Cloud CloudProvider `json:"cloud"`

	// CloudSettings references cloud provider credential secrets used for provisioning clusters.
	// These credentials provide the necessary access to create, modify, and delete cloud resources
	// such as virtual machines, networks, and storage volumes. The specific credential format
	// depends on the cloud provider - AWS requires access keys, Azure uses service principals,
	// and GCP requires service account keys. Not required for bring-your-own-cluster (BYOK) scenarios.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=object
	// +structType=atomic
	CloudSettings *CloudProviderSettings `json:"cloudSettings"`

	// Name is a human-readable identifier for this Provider.
	// This name should be descriptive and help distinguish between multiple providers
	// for the same cloud platform, such as "aws-production" or "gcp-development".
	// The name is immutable once set to ensure consistency across references.
	// +kubebuilder:example:=gcp-provider
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Name is immutable"
	Name string `json:"name"`

	// Namespace specifies the Kubernetes namespace where Cluster API resources are deployed.
	// This namespace will contain the provider-specific controllers, custom resources,
	// and other CAPI components needed for cluster lifecycle management. Different
	// providers can use separate namespaces for better organization and isolation.
	// +kubebuilder:example:=capi-gcp
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Namespace is immutable"
	Namespace string `json:"namespace,omitempty"`
}

// CloudProviderSettings defines references to Kubernetes secrets containing cloud provider credentials.
// Each cloud provider requires different types of credentials and authentication methods.
// Only one cloud provider's credentials should be specified, matching the Cloud field in ProviderSpec.
type CloudProviderSettings struct {
	// AWS specifies a reference to a Kubernetes Secret containing AWS credentials.
	// The secret should contain the necessary access keys and configuration for
	// provisioning resources in Amazon Web Services, typically including
	// access key ID and secret access key pairs.
	// +kubebuilder:validation:Optional
	AWS *v1.SecretReference `json:"aws,omitempty"`

	// Azure specifies a reference to a Kubernetes Secret containing Azure credentials.
	// The secret should contain service principal credentials for Microsoft Azure,
	// including client ID, client secret, tenant ID, and subscription ID needed
	// for provisioning resources in Azure.
	// +kubebuilder:validation:Optional
	Azure *v1.SecretReference `json:"azure,omitempty"`

	// GCP specifies a reference to a Kubernetes Secret containing Google Cloud Platform credentials.
	// The secret should contain a service account key in JSON format with the necessary
	// permissions for provisioning resources in Google Cloud Platform.
	// +kubebuilder:validation:Optional
	GCP *v1.SecretReference `json:"gcp,omitempty"`
}
