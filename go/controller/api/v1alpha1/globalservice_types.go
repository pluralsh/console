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
	"k8s.io/apimachinery/pkg/runtime"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

func init() {
	SchemeBuilder.Register(&GlobalService{}, &GlobalServiceList{})
}

// Cascade is a specification for deletion behavior of owned resources
type Cascade struct {
	// Whether you want to delete owned resources in Plural but leave kubernetes objects in-place
	// +kubebuilder:validation:Optional
	Detach *bool `json:"detach,omitempty"`

	// Whether you want to delete owned resources in Plural and in the targeted k8s cluster
	// +kubebuilder:validation:Optional
	Delete *bool `json:"delete,omitempty"`
}

func (c *Cascade) Attributes() *console.CascadeAttributes {
	if c == nil {
		return nil
	}

	return &console.CascadeAttributes{
		Delete: c.Delete,
		Detach: c.Detach,
	}
}

// GlobalServiceSpec defines the desired state of GlobalService
type GlobalServiceSpec struct {
	// Tags a set of tags to select clusters for this global service
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	// Whether you'd want this global service to take ownership of existing Plural services
	// +kubebuilder:validation:Optional
	Reparent *bool `json:"reparent,omitempty"`

	// Interval specifies the interval at which the global service will be reconciled, default is 10m
	// +kubebuilder:validation:Optional
	Interval *string `json:"interval,omitempty"`

	// Cascade deletion options for this global service
	// +kubebuilder:validation:Optional
	Cascade *Cascade `json:"cascade,omitempty"`

	// Context to be used for dynamic template overrides of things like helm chart, version or values files
	// +kubebuilder:validation:Optional
	Context *TemplateContext `json:"context,omitempty"`

	// Distro of kubernetes this cluster is running
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum=GENERIC;EKS;AKS;GKE;RKE;K3S
	Distro *console.ClusterDistro `json:"distro,omitempty"`

	// Whether to include management clusters in the target set
	// +kubebuilder:validation:Optional
	Mgmt *bool `json:"mgmt,omitempty"`

	// ServiceRef to replicate across clusters
	// +kubebuilder:validation:Optional
	ServiceRef *corev1.ObjectReference `json:"serviceRef,omitempty"`
	// ProviderRef apply to clusters with this provider
	// +kubebuilder:validation:Optional
	ProviderRef *corev1.ObjectReference `json:"providerRef,omitempty"`

	// ProjectRef allows a global service to span a specific project only
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// +kubebuilder:validation:Optional
	Template *ServiceTemplate `json:"template,omitempty"`
}

// TemplateContext is a spec for describing data for templating the metadata of the services spawned by a global service
type TemplateContext struct {
	// A raw yaml map to use for service template context
	// +kubebuilder:validation:Optional
	Raw *runtime.RawExtension `json:"raw,omitempty"`
}

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

	return tags
}

// GlobalService is the Schema for the globalservices API
// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Global service Id"
type GlobalService struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   GlobalServiceSpec `json:"spec,omitempty"`
	Status Status            `json:"status,omitempty"`
}

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

func (tc *TemplateContext) Attributes() *console.TemplateContextAttributes {
	if tc == nil {
		return nil
	}

	return &console.TemplateContextAttributes{Raw: lo.ToPtr(string(tc.Raw.Raw))}
}

func (p *GlobalService) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

// GlobalServiceList contains a list of GlobalService
// +kubebuilder:object:root=true
type GlobalServiceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []GlobalService `json:"items"`
}
