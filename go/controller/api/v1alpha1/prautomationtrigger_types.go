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
)

// PrAutomationTriggerSpec defines the desired state of PrAutomationTrigger.
// A trigger executes a specific PR automation with custom configuration and branch settings,
// enabling programmatic and event-driven generation of pull requests for infrastructure changes.
type PrAutomationTriggerSpec struct {
	// PrAutomationRef points to the source PrAutomation resource that defines
	// the templates, operations, and target repository for the generated PR.
	// +kubebuilder:validation:Optional
	PrAutomationRef *corev1.ObjectReference `json:"prAutomationRef,omitempty"`

	// Branch specifies the name of the branch that should be created for this PR
	// against the PrAutomation's configured base branch. This allows multiple
	// triggers to operate on the same automation without conflicts.
	// +kubebuilder:validation:Required
	Branch string `json:"branch,omitempty"`

	// Context provides the configuration values that will be used to template
	// the PR content, file modifications, and metadata. This should match the
	// configuration schema defined in the referenced PrAutomation.
	// +kubebuilder:validation:Optional
	Context runtime.RawExtension `json:"context,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// PrAutomationTrigger initiates the execution of a PR automation with specific parameters.
// This resource enables automated, event-driven, or scheduled generation of pull requests
// by providing configuration context and branch information to an existing PrAutomation.
type PrAutomationTrigger struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the PrAutomationTrigger, including
	// the target automation, branch name, and configuration context.
	Spec PrAutomationTriggerSpec `json:"spec,omitempty"`

	// Status represents the current state of this PrAutomationTrigger resource.
	Status Status `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// PrAutomationTriggerList contains a list of PrAutomationTrigger
type PrAutomationTriggerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PrAutomationTrigger `json:"items"`
}

func init() {
	SchemeBuilder.Register(&PrAutomationTrigger{}, &PrAutomationTriggerList{})
}

func (p *PrAutomationTrigger) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}
