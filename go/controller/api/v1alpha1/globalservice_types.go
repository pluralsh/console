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
	"slices"
	"strings"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/samber/lo"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&GlobalService{}, &GlobalServiceList{})
}

// +kubebuilder:object:root=true

// GlobalServiceList contains a list of GlobalService resources.
type GlobalServiceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []GlobalService `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Global service Id"

// GlobalService handles the deployment and management of services across multiple clusters.
// It provides a centralized way to define service deployments that should be replicated across
// a fleet of Kubernetes clusters, with flexible targeting based
// on cluster properties, tags, and organizational boundaries.
type GlobalService struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   GlobalServiceSpec `json:"spec,omitempty"`
	Status Status            `json:"status,omitempty"`
}

// Attributes converts the GlobalService spec to console API attributes for upstream synchronization.
func (gs *GlobalService) Attributes(providerId, projectId *string) console.GlobalServiceAttributes {
	return console.GlobalServiceAttributes{
		Name:       gs.Name,
		Distro:     gs.Spec.Distro,
		ProviderID: providerId,
		ProjectID:  projectId,
		Mgmt:       gs.Spec.Mgmt,
		Interval:   gs.Spec.Interval,
		Reparent:   gs.Spec.Reparent,
		Cascade:    gs.Spec.Cascade.Attributes(),
		Tags:       gs.Spec.TagsAttribute(),
		Context:    gs.Spec.Context.Attributes(),
	}
}

// SetCondition sets a condition on the GlobalService status.
func (gs *GlobalService) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&gs.Status.Conditions, condition)
}

// GlobalServiceSpec defines the desired state of a GlobalService.
// It enables the deployment and management of services across multiple Kubernetes clusters
// with flexible targeting, templating, and lifecycle management capabilities.
type GlobalServiceSpec struct {
	// Tags specify a set of key-value pairs used to select target clusters for this global service.
	// Only clusters that match all specified tags will be included in the deployment scope.
	// This provides a flexible mechanism for targeting specific cluster groups or environments.
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	// Reparent indicates whether this global service should take ownership of existing
	// Plural services that match the targeting criteria. When true, existing services
	// will be brought under the management of this GlobalService resource.
	// +kubebuilder:validation:Optional
	Reparent *bool `json:"reparent,omitempty"`

	// Interval specifies the reconciliation interval for the global service.
	// This controls how frequently the controller checks and updates the service deployments
	// across target clusters. Defaults to 10 minutes if not specified.
	// +kubebuilder:validation:Optional
	Interval *string `json:"interval,omitempty"`

	// Cascade defines the deletion behavior for resources owned by this global service.
	// This controls whether resources are removed from Plural Console only, target clusters only,
	// or both during service deletion operations.
	// +kubebuilder:validation:Optional
	Cascade *Cascade `json:"cascade,omitempty"`

	// Context provides data for dynamic template overrides of service deployment properties
	// such as Helm chart versions, values files, or other configuration parameters.
	// This enables environment-specific customization while maintaining a single service definition.
	// +kubebuilder:validation:Optional
	Context *TemplateContext `json:"context,omitempty"`

	// Distro specifies the Kubernetes distribution type for target cluster selection.
	// This allows targeting services to specific cluster types that may have
	// distribution-specific requirements or optimizations.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum=GENERIC;EKS;AKS;GKE;RKE;K3S
	Distro *console.ClusterDistro `json:"distro,omitempty"`

	// Mgmt indicates whether to include management clusters in the target cluster set.
	// Management clusters typically host the Plural Console and operators, and may
	// require special consideration for service deployments.
	// +kubebuilder:validation:Optional
	Mgmt *bool `json:"mgmt,omitempty"`

	// ServiceRef references an existing ServiceDeployment to replicate across target clusters.
	// This allows leveraging an existing service definition as a template for global deployment.
	// +kubebuilder:validation:Optional
	ServiceRef *corev1.ObjectReference `json:"serviceRef,omitempty"`

	// ProviderRef restricts deployment to clusters associated with a specific cloud provider.
	// This enables provider-specific service deployments that may require particular
	// cloud integrations or provider-native services.
	// +kubebuilder:validation:Optional
	ProviderRef *corev1.ObjectReference `json:"providerRef,omitempty"`

	// ProjectRef constrains the global service scope to clusters within a specific project.
	// This provides project-level isolation and ensures services are only deployed
	// to clusters belonging to the designated project.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// Template defines the service deployment specification to be applied across target clusters.
	// This contains the core service definition including Helm charts, configurations,
	// and deployment parameters that will be instantiated on each matching cluster.
	// +kubebuilder:validation:Optional
	Template *ServiceTemplate `json:"template,omitempty"`
}

// TagsAttribute converts the tags map to console API tag attributes format.
func (gss *GlobalServiceSpec) TagsAttribute() []*console.TagAttributes {
	if gss.Tags == nil {
		return nil
	}

	tags := make([]*console.TagAttributes, 0)
	for k, v := range gss.Tags {
		tags = append(tags, &console.TagAttributes{
			Name:  k,
			Value: v,
		})
	}

	slices.SortFunc(tags, func(a, b *console.TagAttributes) int {
		return strings.Compare(a.Name, b.Name)
	})

	return tags
}

// Cascade defines the deletion behavior for resources owned by a GlobalService.
// It provides fine-grained control over whether resources should be deleted from
// the Plural Console, the target Kubernetes clusters, or both during cleanup operations.
type Cascade struct {
	// Detach specifies whether to delete owned resources in Plural Console but leave
	// the corresponding Kubernetes objects in-place in the target clusters.
	// This allows for graceful handoff of resource management without disrupting running workloads.
	// +kubebuilder:validation:Optional
	Detach *bool `json:"detach,omitempty"`

	// Delete specifies whether to delete owned resources both in Plural Console
	// and in the targeted Kubernetes clusters. When true, this performs a complete
	// cleanup of all associated resources across the entire service deployment.
	// +kubebuilder:validation:Optional
	Delete *bool `json:"delete,omitempty"`
}

// Attributes converts the Cascade spec to console API attributes.
func (c *Cascade) Attributes() *console.CascadeAttributes {
	if c == nil {
		return nil
	}

	return &console.CascadeAttributes{
		Delete: c.Delete,
		Detach: c.Detach,
	}
}

// TemplateContext provides metadata and configuration data for templating service deployments.
// It enables dynamic customization of service properties based on cluster-specific or
// environment-specific requirements during the deployment process.
type TemplateContext struct {
	// Raw contains arbitrary YAML data that can be used as context for templating
	// service deployment properties. This data is made available to template engines
	// for dynamic substitution of values, configurations, or other deployment parameters.
	// +kubebuilder:validation:Optional
	Raw *runtime.RawExtension `json:"raw,omitempty"`
}

// Attributes converts the TemplateContext to console API attributes.
func (tc *TemplateContext) Attributes() *console.TemplateContextAttributes {
	if tc == nil {
		return nil
	}

	return &console.TemplateContextAttributes{Raw: lo.ToPtr(string(tc.Raw.Raw))}
}
