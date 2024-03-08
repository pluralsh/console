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
)

// NotificationRouterSpec defines the desired state of NotificationRouter
type NotificationRouterSpec struct {
	// Name the name of this router, if not provided NotificationRouter's own name from NotificationRouter.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Events the events to trigger, or use * for any
	Events []string `json:"events,omitempty"`

	// Filters filters by object type
	// +kubebuilder:validation:Optional
	Filters []RouterFilters `json:"filters,omitempty"`

	// RouterSinks sinks to deliver notifications to
	// +kubebuilder:validation:Optional
	RouterSinks []string `json:"routerSinks,omitempty"`
}

type RouterFilters struct {
	// Regex a regex for filtering by things like pr url
	// +kubebuilder:validation:Optional
	Regex *string `json:"regex,omitempty"`
	// ServiceRef whether to enable delivery for events associated with this service
	// +kubebuilder:validation:Optional
	ServiceRef *corev1.ObjectReference `json:"serviceRef,omitempty"`
	// ClusterRef whether to enable delivery for events associated with this cluster
	// +kubebuilder:validation:Optional
	ClusterRef *corev1.ObjectReference `json:"clusterRef,omitempty"`
	// PipelineRef whether to enable delivery for events associated with this pipeline
	// +kubebuilder:validation:Optional
	PipelineRef *corev1.ObjectReference `json:"pipelineRef,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// NotificationRouter is the Schema for the notificationrouters API
type NotificationRouter struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   NotificationRouterSpec `json:"spec,omitempty"`
	Status Status                 `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// NotificationRouterList contains a list of NotificationRouter
type NotificationRouterList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []NotificationRouter `json:"items"`
}

func init() {
	SchemeBuilder.Register(&NotificationRouter{}, &NotificationRouterList{})
}

func (p *NotificationRouter) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

// NotificationName implements NamespacedPluralResource interface
func (p *NotificationRouter) NotificationName() string {
	if p.Spec.Name != nil && len(*p.Spec.Name) > 0 {
		return *p.Spec.Name
	}

	return p.Name
}

func (p *NotificationRouterSpec) HasName() bool {
	return p.Name != nil
}
