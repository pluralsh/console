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
	SchemeBuilder.Register(&PreviewEnvironmentTemplate{}, &PreviewEnvironmentTemplateList{})
}

//+kubebuilder:object:root=true

// PreviewEnvironmentTemplateList contains a list of PreviewEnvironmentTemplate resources.
type PreviewEnvironmentTemplateList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PreviewEnvironmentTemplate `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the PreviewEnvironmentTemplate in the Console API"

// PreviewEnvironmentTemplate automates the creation of temporary preview environments for pull requests.
// It defines how to clone and customize existing services when pull requests are opened, enabling
// developers to test changes in isolated environments before merging. This is particularly useful
// for feature branches, bug fixes, or any changes that need validation in a running environment.
// Common use cases include creating preview environments for web applications, API services,
// or microservices where visual or functional testing is needed before code review approval.
type PreviewEnvironmentTemplate struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the PreviewEnvironmentTemplate, including the reference service
	// to clone, customization template, and integration settings for pull request workflows.
	Spec PreviewEnvironmentTemplateSpec `json:"spec,omitempty"`

	// Status represents the current state of this PreviewEnvironmentTemplate resource, including
	// synchronization status with the Console API and any deployment information.
	Status Status `json:"status,omitempty"`
}

// ConsoleName returns the effective name to be used for this preview environment template.
// It returns the explicitly configured name if provided, otherwise falls back to
// the PreviewEnvironmentTemplate resource's own name from metadata.
func (in *PreviewEnvironmentTemplate) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

// SetCondition sets a condition on the PreviewEnvironmentTemplate status.
func (in *PreviewEnvironmentTemplate) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// Diff compares the current PreviewEnvironmentTemplate configuration with its last known state to determine
// if changes have occurred. It returns whether the resource has changed, the new SHA hash,
// and any error that occurred during comparison.
func (in *PreviewEnvironmentTemplate) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// PreviewEnvironmentTemplateSpec defines the desired state of PreviewEnvironmentTemplate.
// It specifies how to create preview environments by cloning an existing service with customizations,
// enabling automated testing environments for pull requests and feature development.
type PreviewEnvironmentTemplateSpec struct {
	// Name specifies the name for this preview environment template.
	// If not provided, the name from the resource metadata will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// CommentTemplate provides a liquid template for generating custom PR comments.
	// This template can include dynamic information about the preview environment such as
	// URLs, deployment status, or custom instructions for reviewers. Variables from the
	// service template and environment can be interpolated into the comment.
	// +kubebuilder:validation:Optional
	CommentTemplate *string `json:"commentTemplate,omitempty"`

	// ScmConnectionRef references the source control management connection to use for PR operations.
	// This connection is used to post comments on pull requests with preview environment information
	// and to trigger environment creation based on PR events.
	// +kubebuilder:validation:Optional
	ScmConnectionRef *corev1.ObjectReference `json:"scmConnectionRef,omitempty"`

	// ReferenceServiceRef specifies the existing service deployment to use as a template.
	// This service will be cloned and customized according to the Template configuration
	// to create preview environments. The referenced service should be a stable, working
	// deployment that represents the base configuration for preview environments.
	// +kubebuilder:validation:Required
	ReferenceServiceRef corev1.ObjectReference `json:"referenceServiceRef"`

	// FlowRef references the flow that owns and manages this preview environment template.
	// The flow defines the overall workflow and permissions for creating and managing
	// preview environments based on this template.
	// +kubebuilder:validation:Required
	FlowRef corev1.ObjectReference `json:"flowRef"`

	// Template defines the service configuration overrides and customizations to apply
	// when cloning the reference service for preview environments. This includes
	// namespace changes, configuration overrides, and any other modifications needed
	// to create isolated preview environments.
	// +kubebuilder:validation:Required
	Template ServiceTemplate `json:"template"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}
