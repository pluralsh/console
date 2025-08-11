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

func init() {
	SchemeBuilder.Register(&NotificationRouter{}, &NotificationRouterList{})
}

//+kubebuilder:object:root=true

// NotificationRouterList contains a list of NotificationRouter resources.
type NotificationRouterList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []NotificationRouter `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the NotificationRouter in the Console API."

// NotificationRouter routes events from Plural Console to notification destinations.
// It filters events based on type, resource associations, and regex patterns, then
// forwards matching events to configured sinks like Slack, Teams, or in-app notifications.
// Common use cases include routing service deployment events, pipeline failures,
// cluster alerts, and security events to appropriate teams or channels.
type NotificationRouter struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the NotificationRouter, including event subscriptions,
	// filtering criteria, and destination sink configurations.
	Spec NotificationRouterSpec `json:"spec,omitempty"`

	// Status represents the current state of this NotificationRouter resource, including
	// synchronization status and operational health information.
	Status Status `json:"status,omitempty"`
}

// SetCondition sets a condition on the NotificationRouter status.
func (p *NotificationRouter) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

// NotificationName returns the effective name to be used for this notification router.
// It returns the explicitly configured name if provided, otherwise falls back to
// the NotificationRouter resource's own name from metadata.
func (p *NotificationRouter) NotificationName() string {
	if p.Spec.Name != nil && len(*p.Spec.Name) > 0 {
		return *p.Spec.Name
	}

	return p.Name
}

// HasName checks whether this NotificationRouter has an explicitly configured name.
func (p *NotificationRouterSpec) HasName() bool {
	return p.Name != nil
}

// NotificationRouterSpec defines the desired state of NotificationRouter.
// It specifies which events to subscribe to, how to filter them, and where to route
// the resulting notifications.
type NotificationRouterSpec struct {
	// Name specifies the name for this notification router.
	// If not provided, the name from the resource metadata will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Events define the list of event types this router should subscribe to.
	// Use "*" to subscribe to all events, or specify specific event names to filter
	// for particular types of notifications. Common events include deployment updates,
	// service health changes, pipeline status changes, and security alerts.
	// +kubebuilder:validation:Optional
	Events []string `json:"events,omitempty"`

	// Filters define criteria for selectively routing events.
	// These filters control which events trigger notifications, allowing teams
	// to focus on relevant events. Multiple filters can be combined.
	// +kubebuilder:validation:Optional
	Filters []RouterFilters `json:"filters,omitempty"`

	// Sinks specify the notification destinations where filtered events should be delivered.
	// Each sink represents a configured notification channel such as Slack webhooks,
	// Microsoft Teams channels, or in-app notification systems. Events matching the
	// router's criteria will be formatted and sent to all configured sinks.
	// It is a reference to the NotificationSink resource.
	// +kubebuilder:validation:Optional
	Sinks []corev1.ObjectReference `json:"sinks,omitempty"`
}

// RouterFilters defines filtering criteria for routing events to notification destinations.
// Filters can be based on regex patterns, resource associations, or combinations thereof.
type RouterFilters struct {
	// Regex specifies a regular expression pattern for filtering events based on content.
	// This can be used to filter events by URLs, resource names, error messages, or any
	// other textual content within the event data. Use standard regex syntax.
	// +kubebuilder:validation:Optional
	Regex *string `json:"regex,omitempty"`

	// ServiceRef filters events to only those associated with a specific service deployment.
	// +kubebuilder:validation:Optional
	ServiceRef *corev1.ObjectReference `json:"serviceRef,omitempty"`

	// ClusterRef filters events to only those associated with a specific cluster.
	// +kubebuilder:validation:Optional
	ClusterRef *corev1.ObjectReference `json:"clusterRef,omitempty"`

	// PipelineRef filters events to only those associated with a specific pipeline.
	// +kubebuilder:validation:Optional
	PipelineRef *corev1.ObjectReference `json:"pipelineRef,omitempty"`
}
