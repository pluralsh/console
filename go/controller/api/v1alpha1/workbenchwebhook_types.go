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
	SchemeBuilder.Register(&WorkbenchWebhook{}, &WorkbenchWebhookList{})
}

// +kubebuilder:object:root=true

// WorkbenchWebhookList contains a list of WorkbenchWebhook resources.
type WorkbenchWebhookList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []WorkbenchWebhook `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the WorkbenchWebhook in the Console API."
// +kubebuilder:printcolumn:name="READY",type="string",JSONPath=".status.conditions[?(@.type==\"Ready\")].status",description="Whether the WorkbenchWebhook is ready."

// WorkbenchWebhook represents a webhook trigger for a Workbench. When an incoming
// webhook payload matches the configured criteria, a prompt is run on the workbench.
type WorkbenchWebhook struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the WorkbenchWebhook.
	// +kubebuilder:validation:Required
	Spec WorkbenchWebhookSpec `json:"spec"`

	// Status represents the current state of this resource.
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// SetReadOnlyStatus sets the read-only status of the workbench webhook.
func (in *WorkbenchWebhook) SetReadOnlyStatus(readOnly bool) {
	in.Status.ReadOnly = readOnly
}

// ConsoleID implements [PluralResource] interface.
func (in *WorkbenchWebhook) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName implements [PluralResource] interface.
func (in *WorkbenchWebhook) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}
	return in.Name
}

// Diff compares the current WorkbenchWebhook spec with its last known state.
func (in *WorkbenchWebhook) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}
	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// SetCondition sets a condition on the WorkbenchWebhook status.
func (in *WorkbenchWebhook) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *WorkbenchWebhook) Attributes(webhookID, issueWebhookID *string) console.WorkbenchWebhookAttributes {
	return console.WorkbenchWebhookAttributes{
		Name:           new(in.ConsoleName()),
		WebhookID:      webhookID,
		IssueWebhookID: issueWebhookID,
		Matches:        in.Spec.Matches.Attributes(),
		Prompt:         in.Spec.Prompt,
	}
}

// WorkbenchWebhookSpec defines the desired state of a WorkbenchWebhook.
// +kubebuilder:validation:XValidation:rule="has(self.webhookName) || has(self.issueWebhookName)",message="either webhookName or issueWebhookName must be set"
type WorkbenchWebhookSpec struct {
	// WorkbenchRef references the Workbench this webhook trigger belongs to.
	// +kubebuilder:validation:Required
	WorkbenchRef corev1.ObjectReference `json:"workbenchRef"`

	// Name is the unique name for this webhook trigger on the workbench.
	// If not set, metadata.name is used.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Name *string `json:"name,omitempty"`

	// WebhookName is the name of an observability webhook in the Console API that receives events.
	// Either WebhookName or IssueWebhookName must be set.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	WebhookName *string `json:"webhookName,omitempty"`

	// IssueWebhookName is the name of an issue webhook in the Console API that receives events.
	// Either WebhookName or IssueWebhookName must be set.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	IssueWebhookName *string `json:"issueWebhookName,omitempty"`

	// Matches defines criteria to match incoming webhook payloads.
	// +kubebuilder:validation:Optional
	Matches *WorkbenchWebhookMatchesSpec `json:"matches,omitempty"`

	// Prompt is the prompt to run when the webhook matches.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Prompt *string `json:"prompt,omitempty"`

	// Reconciliation settings for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// WorkbenchWebhookMatchesSpec defines criteria to match incoming webhook payloads.
type WorkbenchWebhookMatchesSpec struct {
	// Regex is a regex pattern to match in the webhook body.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Regex *string `json:"regex,omitempty"`

	// Substring is a substring to match in the webhook body.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Substring *string `json:"substring,omitempty"`

	// CaseInsensitive enables case-insensitive matching.
	// +kubebuilder:validation:Optional
	CaseInsensitive *bool `json:"caseInsensitive,omitempty"`
}

func (m *WorkbenchWebhookMatchesSpec) Attributes() *console.WorkbenchWebhookMatchesAttributes {
	if m == nil {
		return nil
	}

	return &console.WorkbenchWebhookMatchesAttributes{
		Regex:           m.Regex,
		Substring:       m.Substring,
		CaseInsensitive: m.CaseInsensitive,
	}
}
