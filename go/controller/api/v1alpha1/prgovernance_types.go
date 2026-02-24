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

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&PrGovernance{}, &PrGovernanceList{})
}

//+kubebuilder:object:root=true

// PrGovernanceList contains a list of PrGovernance resources.
type PrGovernanceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PrGovernance `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Cluster
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the PrGovernance in the Console API"

// PrGovernance defines governance rules and policies for pull request management within Plural Console.
// It enforces organizational policies, approval workflows, and compliance requirements for pull requests
// created through PR automations.
type PrGovernance struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the PrGovernance, including governance rules,
	// webhook configurations, and SCM integration settings for pull request management.
	Spec PrGovernanceSpec `json:"spec,omitempty"`

	// Status represents the current state of this PrGovernance resource, including
	// synchronization status with the Console API and governance rule enforcement status.
	Status Status `json:"status,omitempty"`
}

// SetCondition sets a condition on the PrGovernance status.
func (in *PrGovernance) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// Diff compares the current PrGovernance configuration with its last known state to determine
// if changes have occurred. It returns whether the resource has changed, the new SHA hash,
// and any error that occurred during comparison.
func (in *PrGovernance) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// ConsoleName returns the effective name to be used for this PR governance controller.
// It returns the explicitly configured name if provided, otherwise falls back to
// the PrGovernance resource's own name from metadata.
func (in *PrGovernance) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

// PrGovernanceSpec defines the desired state of PrGovernance.
// It specifies governance rules, approval workflows, and integration settings
// for managing pull requests created through Plural Console automations.
type PrGovernanceSpec struct {
	// Type specifies the type of PR governance controller to use.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum:=WEBHOOK;SERVICE_NOW
	Type console.PrGovernanceType `json:"type"`

	// Name specifies the name for this PR governance controller.
	// If not provided, the name from the resource metadata will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// ConnectionRef references an ScmConnection to reuse its credentials for this governance controller's authentication.
	// +kubebuilder:validation:Required
	ConnectionRef corev1.ObjectReference `json:"connectionRef"`

	// Configuration contains the specific governance settings and rules to enforce on pull requests.
	// This includes webhook configurations, approval requirements, and other policy enforcement
	// mechanisms that control how pull requests are managed and processed.
	// +kubebuilder:validation:Optional
	Configuration *PrGovernanceConfiguration `json:"configuration,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// PrGovernanceConfiguration defines the configuration settings for PR governance enforcement.
// It specifies the mechanisms and integrations used to implement governance policies
// for pull requests managed through Plural Console automations.
type PrGovernanceConfiguration struct {
	// Webhook defines webhook integration settings for governance enforcement.
	// This enables the governance controller to receive notifications about pull request
	// events and respond with appropriate policy enforcement actions such as requiring
	// additional approvals, running compliance checks, or blocking merges.
	// +kubebuilder:validation:Optional
	Webhook *PrGovernanceWebhook `json:"webhook,omitempty"`

	// ServiceNow defines ServiceNow change request integration for PR governance.
	// When set, PRs will require a ServiceNow change request to be opened and approved
	// before merge. The password is read from the referenced Secret.
	// +kubebuilder:validation:Optional
	ServiceNow *PrGovernanceServiceNow `json:"serviceNow,omitempty"`
}

// PrGovernanceWebhook defines webhook configuration for external governance system integration.
// This enables the PR governance controller to integrate with external approval systems,
// compliance platforms, or custom governance workflows that need to be notified about
// or control pull request lifecycle events.
type PrGovernanceWebhook struct {
	// Url specifies the HTTP endpoint where governance webhook notifications should be sent.
	// This URL will receive webhook payloads containing pull request information and governance
	// context, allowing external systems to implement custom approval workflows, compliance
	// checks, or other governance processes. The endpoint should be accessible and configured
	// to handle the webhook payload format expected by the governance system.
	// +kubebuilder:validation:Required
	Url string `json:"url"`
}

// PrGovernanceServiceNow defines ServiceNow integration for PR governance.
// PRs governed by this configuration will create and manage ServiceNow change requests.
type PrGovernanceServiceNow struct {
	// Url is the ServiceNow instance URL (e.g. https://instance.service-now.com).
	// +kubebuilder:validation:Required
	Url string `json:"url"`

	// ChangeModel is the change request model/type (e.g. "Standard"). If empty, "Standard" is used.
	// We currently support the built-in ILI4 models, such as Standard, Normal, and Emergency.
	// +kubebuilder:validation:Optional
	ChangeModel *string `json:"changeModel,omitempty"`

	// Username is the ServiceNow API username for authentication.
	// +kubebuilder:validation:Required
	Username string `json:"username"`

	// PasswordSecretKeyRef references a key in a Secret containing the ServiceNow API password.
	// For namespaced PrGovernance the secret is read from the same namespace; for cluster-scoped
	// PrGovernance set SecretNamespace to the namespace where the secret lives.
	// +kubebuilder:validation:Required
	PasswordSecretKeyRef corev1.SecretKeySelector `json:"passwordSecretKeyRef"`

	// SecretNamespace is the namespace of the secret referenced by PasswordSecretKeyRef.
	// +kubebuilder:validation:Optional
	SecretNamespace *string `json:"secretNamespace,omitempty"`

	// Attributes is optional JSON passed as additional attributes when creating change requests.
	// Not all change attributes need to be provided, we will auto-fill basics like description, implementation plan, backout plan, test plan, etc using AI if not provided.
	// +kubebuilder:validation:Optional
	Attributes *runtime.RawExtension `json:"attributes,omitempty"`
}
