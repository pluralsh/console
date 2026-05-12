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
	SchemeBuilder.Register(&WorkbenchCron{}, &WorkbenchCronList{})
}

// +kubebuilder:object:root=true

// WorkbenchCronList contains a list of WorkbenchCron resources.
type WorkbenchCronList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []WorkbenchCron `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the WorkbenchCron in the Console API."
// +kubebuilder:printcolumn:name="READY",type="string",JSONPath=".status.conditions[?(@.type==\"Ready\")].status",description="Whether the WorkbenchCron is ready."

// WorkbenchCron represents a scheduled cron trigger for a Workbench. It runs a prompt
// on the associated workbench at the configured cron schedule.
type WorkbenchCron struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the WorkbenchCron.
	// +kubebuilder:validation:Required
	Spec WorkbenchCronSpec `json:"spec"`

	// Status represents the current state of this resource.
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// SetReadOnlyStatus sets the read-only status of the workbench cron.
func (in *WorkbenchCron) SetReadOnlyStatus(readOnly bool) {
	in.Status.ReadOnly = readOnly
}

// ConsoleID implements [PluralResource] interface.
func (in *WorkbenchCron) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName implements [PluralResource] interface.
func (in *WorkbenchCron) ConsoleName() string {
	return in.Name
}

// Diff compares the current WorkbenchCron spec with its last known state.
func (in *WorkbenchCron) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}
	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// SetCondition sets a condition on the WorkbenchCron status.
func (in *WorkbenchCron) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *WorkbenchCron) Attributes() console.WorkbenchCronAttributes {
	return console.WorkbenchCronAttributes{
		Crontab: &in.Spec.Crontab,
		Prompt:  in.Spec.Prompt,
	}
}

// WorkbenchCronSpec defines the desired state of a WorkbenchCron.
type WorkbenchCronSpec struct {
	// WorkbenchRef references the Workbench this cron belongs to.
	// +kubebuilder:validation:Required
	WorkbenchRef corev1.ObjectReference `json:"workbenchRef"`

	// Crontab is the cron expression defining the schedule (e.g. */5 * * * *).
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:MinLength=1
	Crontab string `json:"crontab"`

	// Prompt is the prompt to run when the cron triggers.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Prompt *string `json:"prompt,omitempty"`

	// Reconciliation settings for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}
