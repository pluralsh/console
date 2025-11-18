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
)

func init() {
	SchemeBuilder.Register(&Group{}, &GroupList{})
}

//+kubebuilder:object:root=true

// GroupList contains a list of Group resources.
type GroupList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Group `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the Group in the Console API"

// Group represents a group of users within the system, managed via the Console API.
// It includes specifications for the group's name and description.
type Group struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the Group.
	Spec GroupSpec `json:"spec,omitempty"`

	// Status represents the current state of this Group resource, including
	// synchronization status with the Console API.
	Status Status `json:"status,omitempty"`
}

// GroupName returns the effective name to be used for this Group.
// It returns the explicitly configured name if provided, otherwise falls back to
// the Group resource's own name from metadata.
func (in *Group) GroupName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

// SetCondition sets a condition on the Group status.
func (in *Group) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// ConsoleID returns the unique identifier used in the Console API for this Group.
func (in *Group) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName returns the name used in the Console API for this Group.
func (in *Group) ConsoleName() string {
	return in.GroupName()
}

// Diff compares the current Group configuration with its last known state to determine
// if changes have occurred. It returns whether the resource has changed, the new SHA hash,
// and any error that occurred during comparison.
func (in *Group) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// GroupSpec defines the desired state of Group.
type GroupSpec struct {
	// Name specifies the name for this Group.
	// If not provided, the name from the resource metadata will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Description provides a detailed explanation of this Group's purpose.
	// +kubebuilder:validation:Optional
	Description *string `json:"description,omitempty"`

	// Global indicates whether all users in the system are automatically added to this group.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=false
	Global *bool `json:"global,omitempty"`
}
