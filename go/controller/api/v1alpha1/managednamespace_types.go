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
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&ManagedNamespace{}, &ManagedNamespaceList{})
}

// +kubebuilder:object:root=true

// ManagedNamespaceList contains a list of ManagedNamespace resources.
type ManagedNamespaceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ManagedNamespace `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="ManagedNamespace ID"

// ManagedNamespace handles the creation and management of Kubernetes namespaces across multiple clusters.
// It provides a centralized way to define namespace specifications that should be replicated
// across a fleet of Kubernetes clusters.
type ManagedNamespace struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ManagedNamespaceSpec `json:"spec,omitempty"`
	Status Status               `json:"status,omitempty"`
}

// SetCondition sets a condition on the ManagedNamespace status.
func (in *ManagedNamespace) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// NamespaceName returns the effective namespace name to be used when creating the namespace.
// It returns the explicitly configured name if provided, otherwise falls back to
// the ManagedNamespace resource's own name from metadata.
func (in *ManagedNamespace) NamespaceName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

// ManagedNamespaceSpec defines the desired state of a ManagedNamespace.
// It specifies how Kubernetes namespaces should be created and managed across multiple clusters,
// including their metadata, targeting criteria, and associated service deployments.
type ManagedNamespaceSpec struct {
	// Name specifies the name of the namespace once it's placed on a cluster.
	// If not provided, the ManagedNamespace's own name from metadata will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Description provides a short description of the purpose of this namespace.
	// This is useful for documentation and helping teams understand the namespace's role
	// within the broader application architecture.
	// +kubebuilder:validation:Optional
	Description *string `json:"description,omitempty"`

	// Cascade specifies the deletion behavior for resources owned by this managed namespace.
	// This controls whether namespace deletion removes associated resources from
	// Plural Console only, target clusters only, or both.
	// +kubebuilder:validation:Optional
	Cascade *Cascade `json:"cascade,omitempty"`

	// Labels define key-value pairs to be applied to the created namespaces.
	// These labels are applied to the actual Kubernetes namespace resources
	// and can be used for organization, monitoring, and policy enforcement.
	// +kubebuilder:validation:Optional
	Labels map[string]string `json:"labels,omitempty"`

	// Annotations define key-value pairs to be applied to the created namespaces.
	// These annotations are applied to the actual Kubernetes namespace resources
	// and are commonly used for configuration, tooling integration, and metadata.
	// +kubebuilder:validation:Optional
	Annotations map[string]string `json:"annotations,omitempty"`

	// PullSecrets specifies a list of image pull secrets to attach to this namespace.
	// These secrets will be available for pulling container images within the namespace,
	// enabling access to private container registries across all pods in the namespace.
	// +kubebuilder:validation:Optional
	PullSecrets []string `json:"pullSecrets,omitempty"`

	// Service defines the service deployment specification to be created within this namespace.
	// This allows for automatic deployment of applications or infrastructure components
	// as part of the namespace provisioning process.
	// +kubebuilder:validation:Optional
	Service *ServiceTemplate `json:"service,omitempty"`

	// Target specifies the targeting criteria for selecting which clusters should receive this namespace.
	// This enables flexible namespace distribution based on tags and Kubernetes distributions.
	// +kubebuilder:validation:Optional
	Target *ClusterTarget `json:"target,omitempty"`

	// ProjectRef constrains the managed namespace scope to clusters within a specific project.
	// This provides project-level isolation and ensures namespaces are only created
	// on clusters belonging to the designated project.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`
}

// ClusterTarget defines the criteria for selecting target clusters where managed namespaces should be created.
// It provides flexible targeting mechanisms based on cluster metadata and properties,
// enabling fine-grained control over namespace distribution across a fleet of clusters.
type ClusterTarget struct {
	// Tags specify a set of key-value pairs used to select target clusters.
	// Only clusters that match all specified tags will receive the managed namespace.
	// This provides a flexible mechanism for targeting specific cluster groups,
	// environments, or organizational boundaries.
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	// Distro specifies the Kubernetes distribution type for target cluster selection.
	// This allows targeting namespaces to specific cluster types that may have
	// distribution-specific requirements, networking configurations, or security policies.
	// +kubebuilder:validation:Optional
	Distro *console.ClusterDistro `json:"distro,omitempty"`
}

// ServiceTemplate defines the configuration for a service to be deployed within a managed namespace.
// This enables automatic application deployment as part of the namespace provisioning process.
type ServiceTemplate struct {
	// Name specifies the name for the service deployment.
	// For managed namespaces, this is optional and can be auto-generated
	// if not explicitly provided.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Namespace specifies the namespace for the service deployment.
	// For managed namespaces, this is typically auto-populated with
	// the managed namespace name if not explicitly provided.
	// +kubebuilder:validation:Optional
	Namespace *string `json:"namespace,omitempty"`

	// Templated indicates whether to apply liquid templating to raw YAML files.
	// When enabled, allows for dynamic configuration injection and
	// environment-specific customization of service manifests.
	// +kubebuilder:validation:Optional
	Templated *bool `json:"templated,omitempty"`

	// RepositoryRef references a GitRepository resource containing the service manifests.
	// This provides the source location for Kubernetes YAML files, Helm charts,
	// or other deployment artifacts needed for the service.
	// +kubebuilder:validation:Optional
	RepositoryRef *corev1.ObjectReference `json:"repositoryRef"`

	// Protect indicates whether to protect this service from deletion.
	// Protected services are not automatically deleted during namespace cleanup
	// or cluster deletion operations, providing safety for critical workloads.
	// +kubebuilder:validation:Optional
	Protect *bool `json:"protect,omitempty"`

	// Contexts specifies a list of context names to add to this service.
	// Contexts provide reusable configuration bundles that can be shared
	// across multiple services for consistent environment setup.
	// +kubebuilder:validation:Optional
	Contexts []string `json:"contexts,omitempty"`

	// Git defines Git-specific settings for sourcing service manifests.
	// This includes repository references, branch/tag specifications,
	// and subdirectory paths within the Git repository.
	// +kubebuilder:validation:Optional
	Git *GitRef `json:"git,omitempty"`

	// Helm defines Helm-specific settings for deploying Helm charts as part of this service.
	// This includes chart specifications, values files, repository references,
	// and Helm-specific deployment options.
	// +kubebuilder:validation:Optional
	Helm *ServiceHelm `json:"helm,omitempty"`

	// Kustomize defines Kustomize-specific settings for manifest customization.
	// This enables sophisticated YAML manipulation and configuration overlay
	// capabilities for complex deployment scenarios.
	// +kubebuilder:validation:Optional
	Kustomize *ServiceKustomize `json:"kustomize,omitempty"`

	// SyncConfig defines advanced synchronization settings for the service deployment.
	// This includes options for namespace management, drift detection configuration,
	// and deployment behavior customization.
	// +kubebuilder:validation:Optional
	SyncConfig *SyncConfigAttributes `json:"syncConfig,omitempty"`

	// Dependencies specify other services that must be healthy before this service is deployed.
	// This ensures proper deployment ordering and dependency resolution
	// within the managed namespace.
	// +kubebuilder:validation:Optional
	Dependencies []corev1.ObjectReference `json:"dependencies,omitempty"`

	// ConfigurationRef references a Kubernetes Secret containing service-specific configuration.
	// This secret should contain key-value pairs that will be made available
	// to the service for runtime configuration and secrets management.
	// +kubebuilder:validation:Optional
	ConfigurationRef *corev1.SecretReference `json:"configurationRef,omitempty"`

	// Configuration provides a set of non-secret service-specific configuration values.
	// These key-value pairs are useful for templating and can be referenced
	// in manifest templates for environment-specific customization.
	// +kubebuilder:validation:Optional
	Configuration map[string]string `json:"configuration,omitempty"`

	// Sources specify additional Git repositories or locations to source manifests from.
	// This enables multi-repository deployments and complex source composition
	// for sophisticated application architectures.
	// +kubebuilder:validation:Optional
	Sources []Source `json:"sources,omitempty"`

	// Renderers specify how manifests should be processed and rendered.
	// This includes options for Helm chart rendering, Kustomize processing,
	// and other manifest transformation workflows.
	// +kubebuilder:validation:Optional
	Renderers []Renderer `json:"renderers,omitempty"`
}
