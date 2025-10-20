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
	"github.com/pluralsh/console/go/controller/api/common"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&ObservabilityProvider{}, &ObservabilityProviderList{})
}

//+kubebuilder:object:root=true

// ObservabilityProviderList contains a list of ObservabilityProvider resources.
type ObservabilityProviderList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []ObservabilityProvider `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the ObservabilityProvider in the Console API"

// ObservabilityProvider configures external monitoring and observability platforms for use with Plural Console.
// It enables integration with services like Datadog and New Relic to provide enhanced monitoring capabilities
// for infrastructure stacks and service deployments. The provider can be used by InfrastructureStack resources
// to monitor metrics and determine if operations should be cancelled based on system health indicators.
// Common use cases include monitoring deployment health or tracking infrastructure performance metrics.
type ObservabilityProvider struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the ObservabilityProvider, including the provider type
	// and authentication credentials needed to connect to the external monitoring service.
	// +kubebuilder:validation:Required
	Spec ObservabilityProviderSpec `json:"spec"`

	// Status represents the current state of this ObservabilityProvider resource, including
	// synchronization status with the Console API and connection health information.
	// +kubebuilder:validation:Optional
	Status common.Status `json:"status,omitempty"`
}

// ConsoleName returns the effective name to be used for this observability provider.
// It returns the explicitly configured name if provided, otherwise falls back to
// the ObservabilityProvider resource's own name from metadata.
func (in *ObservabilityProvider) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

// SetCondition sets a condition on the ObservabilityProvider status.
func (in *ObservabilityProvider) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// Diff compares the current ObservabilityProvider configuration with its last known state to determine
// if changes have occurred. It returns whether the resource has changed, the new SHA hash,
// and any error that occurred during comparison.
func (in *ObservabilityProvider) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// Attributes converts the ObservabilityProvider spec to Console API attributes for upstream synchronization.
func (in *ObservabilityProvider) Attributes(credentials client.ObservabilityProviderCredentialsAttributes) client.ObservabilityProviderAttributes {
	return client.ObservabilityProviderAttributes{
		Name:        in.ConsoleName(),
		Type:        in.Spec.Type,
		Credentials: credentials,
	}
}

// ObservabilityProviderSpec defines the desired state of ObservabilityProvider.
// It specifies the type of monitoring service and the credentials needed to authenticate
// and establish connections with external observability platforms.
type ObservabilityProviderSpec struct {
	// Name specifies the name for this observability provider.
	// If not provided, the name from the resource metadata will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Type specifies the observability platform this provider connects to.
	// Currently supported providers include Datadog for comprehensive monitoring and alerting,
	// and New Relic for application performance monitoring and infrastructure insights.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=DATADOG;NEWRELIC
	Type client.ObservabilityProviderType `json:"type"`

	// Credentials contains the authentication information needed to connect to the observability provider.
	// The specific credential format depends on the provider type. Each provider requires different
	// API keys and authentication methods as specified in their respective credential specifications.
	// +kubebuilder:validation:Optional
	Credentials *ObservabilityProviderCredentials `json:"credentials,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *common.Reconciliation `json:"reconciliation,omitempty"`
}

// ObservabilityProviderCredentials defines the authentication credentials for different observability providers.
// Only one provider's credentials should be specified, matching the Type field in the ObservabilityProviderSpec.
// Each provider has different authentication requirements and API key formats.
type ObservabilityProviderCredentials struct {
	// Datadog specifies a reference to a Kubernetes Secret containing Datadog API credentials.
	// The referenced secret must contain two keys:
	// - 'apiKey': Your Datadog API key for authentication
	// - 'appKey': Your Datadog application key for extended API access
	// These keys are obtained from your Datadog account's API settings.
	// +kubebuilder:validation:Optional
	Datadog *v1.SecretReference `json:"datadog,omitempty"`

	// Newrelic specifies a reference to a Kubernetes Secret containing New Relic API credentials.
	// The referenced secret must contain one key:
	// - 'apiKey': Your New Relic API key for authentication and data access
	// This key is obtained from your New Relic account's API settings.
	// +kubebuilder:validation:Optional
	Newrelic *v1.SecretReference `json:"newrelic,omitempty"`
}
