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
	console "github.com/pluralsh/console/go/client"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ManagedNamespaceSpec defines the desired state of ManagedNamespace
type ManagedNamespaceSpec struct {
	// Name of this namespace once its placed on a cluster. If not provided ManagedNamespace's own name from ManagedNamespace.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`
	// Description a short description of the purpose of this namespace
	// +kubebuilder:validation:Optional
	Description *string `json:"description,omitempty"`

	// Cascade specifies how owned resources are deleted
	Cascade *Cascade `json:"cascade,omitempty"`

	// Labels for this namespace
	// +kubebuilder:validation:Optional
	Labels map[string]string `json:"labels,omitempty"`
	// Annotations for this namespace
	// +kubebuilder:validation:Optional
	Annotations map[string]string `json:"annotations,omitempty"`
	// PullSecrets a list of pull secrets to attach to this namespace
	// +kubebuilder:validation:Optional
	PullSecrets []string `json:"pullSecrets,omitempty"`
	// +kubebuilder:validation:Optional
	Service *ServiceTemplate `json:"service,omitempty"`
	// +kubebuilder:validation:Optional
	Target *ClusterTarget `json:"target,omitempty"`

	// ProjectRef allows a managed namespace to span a specific project only
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`
}

// A spec for targeting clusters
type ClusterTarget struct {
	// Tags the cluster tags to target
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`
	// Distro kubernetes distribution to target
	// +kubebuilder:validation:Optional
	Distro *console.ClusterDistro `json:"distro,omitempty"`
	//// +kubebuilder:validation:Optional
	//ClusterRefs []corev1.ObjectReference `json:"clusterRefs,omitempty"`
}

// Attributes for configuring a service in something like a managed namespace
type ServiceTemplate struct {
	// Name the name for this service (optional for managed namespaces)
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`
	// Namespace the namespace for this service (optional for managed namespaces)
	// +kubebuilder:validation:Optional
	Namespace *string `json:"namespace,omitempty"`
	// +kubebuilder:validation:Optional
	Templated *bool `json:"templated,omitempty"`
	// +kubebuilder:validation:Optional
	RepositoryRef *corev1.ObjectReference `json:"repositoryRef"`

	// Whether to protect this service from deletion.  Protected services are also not drained on cluster deletion.
	// +kubebuilder:validation:Optional
	Protect *bool `json:"protect,omitempty"`

	// a list of context ids to add to this service
	// +kubebuilder:validation:Optional
	Contexts []string `json:"contexts,omitempty"`
	// Git settings to configure git for a service
	// +kubebuilder:validation:Optional
	Git *GitRef `json:"git,omitempty"`
	// Helm settings to configure helm for a service
	// +kubebuilder:validation:Optional
	Helm *ServiceHelm `json:"helm,omitempty"`
	// Kustomize settings for service kustomization
	// +kubebuilder:validation:Optional
	Kustomize *ServiceKustomize `json:"kustomize,omitempty"`
	// SyncConfig attributes to configure sync settings for this service
	// +kubebuilder:validation:Optional
	SyncConfig *SyncConfigAttributes `json:"syncConfig,omitempty"`
	// Dependencies contain dependent services
	// +kubebuilder:validation:Optional
	Dependencies []corev1.ObjectReference `json:"dependencies,omitempty"`
	// ConfigurationRef is a secret reference which should contain service configuration.
	// +kubebuilder:validation:Optional
	ConfigurationRef *corev1.SecretReference `json:"configurationRef,omitempty"`

	// Configuration is a set of non-secret service specific configuration useful for templating
	// +kubebuilder:validation:Optional
	Configuration map[string]string `json:"configuration,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="ManagedNamespace ID"
// ManagedNamespace is the Schema for the managednamespaces API
type ManagedNamespace struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ManagedNamespaceSpec `json:"spec,omitempty"`
	Status Status               `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ManagedNamespaceList contains a list of ManagedNamespace
type ManagedNamespaceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ManagedNamespace `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ManagedNamespace{}, &ManagedNamespaceList{})
}

func (p *ManagedNamespace) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

func (p *ManagedNamespace) NamespaceName() string {
	if p.Spec.Name != nil && len(*p.Spec.Name) > 0 {
		return *p.Spec.Name
	}

	return p.Name
}
