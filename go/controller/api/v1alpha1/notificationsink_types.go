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
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&NotificationSink{}, &NotificationSinkList{})
}

//+kubebuilder:object:root=true

// NotificationSinkList contains a list of NotificationSink resources.
type NotificationSinkList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []NotificationSink `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the NotificationSink in the Console API."

// NotificationSink defines notification delivery destinations for events routed by NotificationRouter.
// It represents the actual channels where notifications are sent, such as Slack webhooks,
// Microsoft Teams channels, or in-app notifications. NotificationSinks are referenced by
// NotificationRouter resources to determine where filtered events should be delivered.
type NotificationSink struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the NotificationSink, including the sink type,
	// destination configuration, and delivery settings.
	Spec NotificationSinkSpec `json:"spec,omitempty"`

	// Status represents the current state of this NotificationSink resource, including
	// synchronization status and operational health information.
	Status Status `json:"status,omitempty"`
}

// SetCondition sets a condition on the NotificationSink status.
func (p *NotificationSink) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

// NotificationName implements NamespacedPluralResource interface
func (p *NotificationSink) NotificationName() string {
	if p.Spec.Name != nil && len(*p.Spec.Name) > 0 {
		return *p.Spec.Name
	}

	return p.Name
}

func (p *NotificationSinkSpec) HasName() bool {
	return p.Name != nil
}

// NotificationSinkSpec defines the desired state of NotificationSink.
// It specifies the type of notification channel, destination configuration,
// and delivery preferences for events routed to this sink.
type NotificationSinkSpec struct {
	// Name specifies the name for this notification sink.
	// If not provided, the name from the resource metadata will be used. // +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Type specifies the channel type of this sink.
	// Determines which configuration section will be used and how notifications are delivered.
	// SLACK and TEAMS require webhook URLs, while PLURAL delivers in-app notifications.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=SLACK;TEAMS;PLURAL
	Type console.SinkType `json:"type"`

	// Configuration contains the type-specific settings for this notification sink.
	// Only one configuration section should be populated based on the Type field.
	// Each type has different requirements for delivery setup and authentication.
	// +kubebuilder:validation:Optional
	Configuration SinkConfiguration `json:"configuration"`

	// Bindings define the users and groups who can receive notifications through this sink.
	// This is only applicable for PLURAL type sinks that deliver in-app notifications.
	// For external sinks like Slack or Teams, notifications are sent to the configured webhook.
	// +kubebuilder:validation:Optional
	Bindings []Binding `json:"bindings,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// SinkConfiguration contains type-specific configuration for different notification channels.
// Only one configuration section should be populated based on the sink type.
// Each configuration type has different requirements and delivery mechanisms.
type SinkConfiguration struct {
	// Slack configuration for delivering notifications to Slack channels via webhook URLs.
	// Requires a valid Slack incoming webhook URL configured in your Slack workspace.
	// +kubebuilder:validation:Optional
	Slack *SinkURL `json:"slack,omitempty"`

	// Teams configuration for delivering notifications to Microsoft Teams channels.
	// Requires a valid Teams incoming webhook URL configured in your Teams workspace.
	// +kubebuilder:validation:Optional
	Teams *SinkURL `json:"teams,omitempty"`

	// Plural configuration for delivering in-app notifications within the Plural Console.
	// These notifications appear in the Console UI and can optionally trigger email delivery.
	// +kubebuilder:validation:Optional
	Plural *PluralSinkConfiguration `json:"plural,omitempty"`
}

// SinkURL defines the webhook URL configuration for external notification services.
// Used by both Slack and Teams sink types to specify the destination webhook endpoint.
type SinkURL struct {
	// URL is the webhook endpoint where notifications will be delivered.
	// This should be a valid HTTP/HTTPS URL provided by your Slack or Teams workspace
	// when configuring incoming webhooks for the target channel.
	// +kubebuilder:validation:Required
	URL string `json:"url"`
}

// PluralSinkConfiguration defines settings for in-app notifications within Plural Console.
// These notifications appear in the Console interface and can be configured for priority
// and immediate email delivery based on urgency requirements.
type PluralSinkConfiguration struct {
	// Priority determines the importance level of notifications delivered through this sink.
	// Higher priority notifications may be displayed more prominently in the Console UI
	// and can influence notification filtering and display behavior.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum=LOW;MEDIUM;HIGH
	Priority console.NotificationPriority `json:"priority,omitempty"`

	// Urgent controls whether notifications should be immediately delivered via email.
	// When true, notifications sent to this sink will trigger immediate SMTP delivery
	// in addition to appearing in the Console UI, useful for critical alerts.
	// +kubebuilder:validation:Optional
	Urgent *bool `json:"urgent,omitempty"`
}
