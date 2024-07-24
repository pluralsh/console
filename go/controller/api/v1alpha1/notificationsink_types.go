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
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// NotificationSinkSpec defines the desired state of NotificationSink
type NotificationSinkSpec struct {
	// Name the name of this service, if not provided NotificationSink's own name from NotificationSink.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Type the channel type of this sink.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum=SLACK;TEAMS
	Type console.SinkType `json:"type"`

	// Configuration for the specific type
	// +kubebuilder:validation:Optional
	Configuration SinkConfiguration `json:"configuration"`
}

type SinkConfiguration struct {
	// Slack url
	// +kubebuilder:validation:Optional
	Slack *SinkURL `json:"slack,omitempty"`
	// Teams url
	// +kubebuilder:validation:Optional
	Teams *SinkURL `json:"teams,omitempty"`
}

type SinkURL struct {
	URL string `json:"url"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// NotificationSink is the Schema for the notificationsinks API
type NotificationSink struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   NotificationSinkSpec `json:"spec,omitempty"`
	Status Status               `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// NotificationSinkList contains a list of NotificationSink
type NotificationSinkList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []NotificationSink `json:"items"`
}

func init() {
	SchemeBuilder.Register(&NotificationSink{}, &NotificationSinkList{})
}

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
