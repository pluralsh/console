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

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&WorkbenchPrompt{}, &WorkbenchPromptList{})
}

// +kubebuilder:object:root=true

// WorkbenchPromptList contains a list of WorkbenchPrompt resources.
type WorkbenchPromptList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []WorkbenchPrompt `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the WorkbenchPrompt in the Console API."
// +kubebuilder:printcolumn:name="READY",type="string",JSONPath=".status.conditions[?(@.type==\"Ready\")].status",description="Whether the WorkbenchPrompt is ready."

// WorkbenchPrompt represents a saved prompt for a Workbench.
type WorkbenchPrompt struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the WorkbenchPrompt.
	// +kubebuilder:validation:Required
	Spec WorkbenchPromptSpec `json:"spec"`

	// Status represents the current state of this resource.
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// ConsoleID implements [PluralResource] interface.
func (in *WorkbenchPrompt) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName implements [PluralResource] interface.
func (in *WorkbenchPrompt) ConsoleName() string {
	if in.Spec.Title != nil && len(*in.Spec.Title) > 0 {
		return *in.Spec.Title
	}
	return in.Name
}

// Diff compares the current WorkbenchPrompt spec with its last known state.
func (in *WorkbenchPrompt) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(struct {
		Title    *string
		Category *string
		Prompt   string
	}{
		Title:    in.Spec.Title,
		Category: in.Spec.Category,
		Prompt:   in.Spec.Prompt,
	})
	if err != nil {
		return false, "", err
	}
	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// SetCondition sets a condition on the WorkbenchPrompt status.
func (in *WorkbenchPrompt) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *WorkbenchPrompt) Attributes() console.WorkbenchPromptAttributes {
	return console.WorkbenchPromptAttributes{
		Title:    in.Spec.Title,
		Category: in.Spec.Category,
		Prompt:   in.Spec.Prompt,
	}
}

// WorkbenchPromptSpec defines the desired state of a WorkbenchPrompt.
type WorkbenchPromptSpec struct {
	// WorkbenchRef references the Workbench this prompt belongs to.
	// +kubebuilder:validation:Required
	WorkbenchRef corev1.ObjectReference `json:"workbenchRef"`

	// Title is the display title for the saved prompt.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Title *string `json:"title,omitempty"`

	// Category is the grouping category for the saved prompt.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Category *string `json:"category,omitempty"`

	// Prompt is the saved prompt text.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:MinLength=1
	Prompt string `json:"prompt"`

	// Reconciliation settings for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}
