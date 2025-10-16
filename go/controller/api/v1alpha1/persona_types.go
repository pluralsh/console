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
	SchemeBuilder.Register(&Persona{}, &PersonaList{})
}

//+kubebuilder:object:root=true

// PersonaList contains a list of Persona resources.
type PersonaList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Persona `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the Persona in the Console API"

// Persona defines role-based UI configurations for different types of users in Plural Console.
// It allows customizing the user interface based on user roles such as platform engineers, developers,
// security teams, or management. Each persona controls which features and sections of the Console
// are visible and accessible to users assigned to it. This enables organizations to provide
// tailored experiences that match different user responsibilities and reduce interface complexity
// for specific roles. Common use cases include hiding infrastructure details from developers
// or providing simplified dashboards for management oversight.
type Persona struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the Persona, including role configuration,
	// UI customizations, and group bindings for role-based access control.
	Spec PersonaSpec `json:"spec,omitempty"`

	// Status represents the current state of this Persona resource, including
	// synchronization status with the Console API.
	Status Status `json:"status,omitempty"`
}

// PersonaName returns the effective name to be used for this persona.
// It returns the explicitly configured name if provided, otherwise falls back to
// the Persona resource's own name from metadata.
func (in *Persona) PersonaName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

// SetCondition sets a condition on the Persona status.
func (in *Persona) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// ConsoleID returns the unique identifier used in the Console API for this Persona.
func (in *Persona) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName returns the name used in the Console API for this Persona.
func (in *Persona) ConsoleName() string {
	return in.PersonaName()
}

// Diff compares the current Persona configuration with its last known state to determine
// if changes have occurred. It returns whether the resource has changed, the new SHA hash,
// and any error that occurred during comparison.
func (in *Persona) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// PersonaSpec defines the desired state of Persona.
// It specifies the role-based configuration, UI customizations, and access controls
// that define how the Console interface appears and behaves for users assigned to this persona.
type PersonaSpec struct {
	// Name specifies the name for this persona.
	// If not provided, the name from the resource metadata will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Description provides a detailed explanation of this persona's purpose and intended users.
	// This helps administrators understand which teams or roles should be assigned to this persona
	// and what kind of experience it provides. Examples might describe responsibilities like
	// "Platform engineers managing infrastructure" or "Developers deploying applications".
	// +kubebuilder:validation:Optional
	Description *string `json:"description,omitempty"`

	// Role defines the primary responsibility area for users assigned to this persona.
	// This controls the default homepage layout and highlights relevant features.
	// Different roles provide different perspectives on the same underlying data,
	// optimized for specific workflows and responsibilities.
	// +kubebuilder:validation:Optional
	Role *console.PersonaRole `json:"role,omitempty"`

	// Configuration contains detailed UI customization settings for this persona.
	// These settings are additive across multiple personas assigned to a user,
	// allowing for flexible permission combinations while maintaining role-based defaults.
	// +kubebuilder:validation:Optional
	Configuration *PersonaConfiguration `json:"configuration,omitempty"`

	// Bindings define which users and groups are assigned to this persona.
	// Users can be assigned to multiple personas, with permissions being additive.
	// This enables flexible role combinations while maintaining clear base configurations.
	// +kubebuilder:validation:Optional
	Bindings []Binding `json:"bindings,omitempty"`
}

// PersonaConfiguration defines the complete UI customization settings for a persona.
// These settings control which features, sections, and capabilities are visible
// and accessible to users assigned to this persona, enabling role-specific experiences.
type PersonaConfiguration struct {
	// All enables the complete UI interface for this persona when set to true.
	// This overrides individual feature settings and provides full access to all Console features.
	// Useful for administrative personas that need unrestricted access to all functionality.
	// +kubebuilder:validation:Optional
	All *bool `json:"all,omitempty"`

	// Home configures the homepage layout and content for this persona.
	// Different personas can have customized homepages that highlight the most relevant
	// information and workflows for their specific role and responsibilities.
	// +kubebuilder:validation:Optional
	Home *PersonaHome `json:"home,omitempty"`

	// Deployments controls access to deployment-related features and sections.
	// This includes clusters, services, pipelines, and other deployment management tools.
	// Useful for controlling which teams can view or manage different aspects of deployments.
	// +kubebuilder:validation:Optional
	Deployments *PersonaDeployment `json:"deployments,omitempty"`

	// Sidebar configures which navigation items and sections are visible in the main sidebar.
	// This allows personas to have streamlined navigation focused on their primary workflows
	// while hiding irrelevant or restricted functionality.
	// +kubebuilder:validation:Optional
	Sidebar *PersonaSidebar `json:"sidebar,omitempty"`

	// Services controls access to service-specific features and configuration options.
	// This includes service configuration, secrets management, and other service-level operations.
	// +kubebuilder:validation:Optional
	Services *PersonaServices `json:"services,omitempty"`

	// AI configures access to AI-powered features and capabilities within the Console.
	// This includes AI-assisted operations, automated suggestions, and other intelligent features.
	// +kubebuilder:validation:Optional
	AI *PersonaAI `json:"ai,omitempty"`
}

// Attributes converts the PersonaConfiguration to Console API attributes.
func (in *PersonaConfiguration) Attributes() *console.PersonaConfigurationAttributes {
	if in == nil {
		return nil
	}

	return &console.PersonaConfigurationAttributes{
		All:         in.All,
		Home:        in.Home.Attributes(),
		Deployments: in.Deployments.Attributes(),
		Sidebar:     in.Sidebar.Attributes(),
		Services:    in.Services.Attributes(),
		Ai:          in.AI.Attributes(),
	}
}

// PersonaHome defines homepage customization settings for different persona roles.
// The homepage can be configured to emphasize different aspects of the system
// based on the user's primary responsibilities and information needs.
type PersonaHome struct {
	// Manager enables management-focused homepage content when set to true.
	// This typically includes high-level dashboards, cost summaries, compliance status,
	// and other information relevant to engineering managers and leadership roles.
	// +kubebuilder:validation:Optional
	Manager *bool `json:"manager,omitempty"`

	// Security enables security-focused homepage content when set to true.
	// This includes security alerts, compliance reports, vulnerability summaries,
	// and other security-related metrics and dashboards.
	// +kubebuilder:validation:Optional
	Security *bool `json:"security,omitempty"`
}

// Attributes converts the PersonaHome to Console API attributes.
func (in *PersonaHome) Attributes() *console.PersonaHomeAttributes {
	if in == nil {
		return nil
	}

	return &console.PersonaHomeAttributes{
		Manager:  in.Manager,
		Security: in.Security,
	}
}

// PersonaAI defines access controls for AI-powered features within the Console.
// These settings determine which AI capabilities are available to users assigned to this persona.
type PersonaAI struct {
	// PR enables AI-powered pull request generation and management features.
	// When enabled, users can use AI assistance to create pull requests, generate code changes,
	// and automate various development workflows through AI-powered tools.
	// +kubebuilder:validation:Optional
	PR *bool `json:"pr,omitempty"`
}

// Attributes converts the PersonaAI to Console API attributes.
func (in *PersonaAI) Attributes() *console.PersonaAiAttributes {
	if in == nil {
		return nil
	}

	return &console.PersonaAiAttributes{
		Pr: in.PR,
	}
}

// PersonaServices defines access controls for service-related features and operations.
// These settings control which service management capabilities are available to users
// assigned to this persona, enabling role-based access to sensitive operations.
type PersonaServices struct {
	// Secrets enables access to service secrets management when set to true.
	// This includes viewing, creating, and modifying secrets associated with services.
	// Typically restricted to platform engineers and senior developers who need
	// to manage service authentication and configuration secrets.
	// +kubebuilder:validation:Optional
	Secrets *bool `json:"secrets,omitempty"`

	// Configuration enables access to service configuration management when set to true.
	// This includes modifying service deployment settings, environment variables,
	// and other configuration parameters that affect service behavior.
	// +kubebuilder:validation:Optional
	Configuration *bool `json:"configuration,omitempty"`
}

// Attributes converts the PersonaServices to Console API attributes.
func (in *PersonaServices) Attributes() *console.PersonaServicesAttributes {
	if in == nil {
		return nil
	}

	return &console.PersonaServicesAttributes{
		Secrets:       in.Secrets,
		Configuration: in.Configuration,
	}
}

// PersonaDeployment defines access controls for deployment-related features and views.
// These settings determine which deployment management capabilities are visible and
// accessible to users assigned to this persona.
type PersonaDeployment struct {
	// Clusters enables access to cluster management features when set to true.
	// This includes viewing cluster status, managing cluster resources, and performing
	// cluster-level operations. Typically enabled for platform and infrastructure teams.
	// +kubebuilder:validation:Optional
	Clusters *bool `json:"clusters,omitempty"`

	// Deployments enables access to deployment management features when set to true.
	// This includes viewing and managing application deployments, deployment history,
	// and deployment-related operations across the platform.
	// +kubebuilder:validation:Optional
	Deployments *bool `json:"deployments,omitempty"`

	// Repositories enables access to Git repository management features when set to true.
	// This includes configuring source repositories, managing Git credentials,
	// and other repository-related operations for deployments.
	// +kubebuilder:validation:Optional
	Repositories *bool `json:"repositories,omitempty"`

	// Services enables access to service management features when set to true.
	// This includes viewing service status, managing service configurations,
	// and performing service-level operations and troubleshooting.
	// +kubebuilder:validation:Optional
	Services *bool `json:"services,omitempty"`

	// Pipelines enables access to CI/CD pipeline features when set to true.
	// This includes viewing pipeline status, managing pipeline configurations,
	// and triggering pipeline executions for automated deployments.
	// +kubebuilder:validation:Optional
	Pipelines *bool `json:"pipelines,omitempty"`

	// Providers enables access to cloud provider management features when set to true.
	// This includes managing cloud provider credentials, configuring provider settings,
	// and other provider-related operations for infrastructure management.
	// +kubebuilder:validation:Optional
	Providers *bool `json:"providers,omitempty"`

	// AddOns enables access to Kubernetes add-on management features when set to true.
	// This includes installing, configuring, and managing cluster add-ons.
	// +kubebuilder:validation:Optional
	AddOns *bool `json:"addOns,omitempty"`
}

// Attributes converts the PersonaDeployment to Console API attributes.
func (in *PersonaDeployment) Attributes() *console.PersonaDeploymentAttributes {
	if in == nil {
		return nil
	}

	return &console.PersonaDeploymentAttributes{
		Clusters:     in.Clusters,
		Deployments:  in.Deployments,
		Repositories: in.Repositories,
		Services:     in.Services,
		Pipelines:    in.Pipelines,
		Providers:    in.Providers,
		AddOns:       in.AddOns,
	}
}

// PersonaSidebar defines which navigation items and sections are visible in the main Console sidebar.
// These settings allow personas to have customized navigation focused on their primary workflows
// while hiding irrelevant or restricted functionality from the user interface.
type PersonaSidebar struct {
	// Audits enables access to audit logs and compliance reporting features when set to true.
	// This includes viewing system audit trails, user activity logs, and compliance reports.
	// Typically enabled for security teams and compliance officers.
	// +kubebuilder:validation:Optional
	Audits *bool `json:"audits,omitempty"`

	// Kubernetes enables access to direct Kubernetes management features when set to true.
	// This includes raw Kubernetes resource management, kubectl-like operations,
	// and low-level cluster administration tasks.
	// +kubebuilder:validation:Optional
	Kubernetes *bool `json:"kubernetes,omitempty"`

	// PullRequests enables access to pull request management features when set to true.
	// This includes viewing and managing pull requests and Git-based deployment automation features.
	// +kubebuilder:validation:Optional
	PullRequests *bool `json:"pullRequests,omitempty"`

	// Settings enables access to system configuration and administrative settings when set to true.
	// This includes user management, system configuration, integration settings,
	// and other administrative functions. Typically restricted to administrators.
	// +kubebuilder:validation:Optional
	Settings *bool `json:"settings,omitempty"`

	// Backups enables access to backup and restore management features when set to true.
	// This includes configuring backup policies, managing backup storage,
	// and performing restore operations for disaster recovery.
	// +kubebuilder:validation:Optional
	Backups *bool `json:"backups,omitempty"`

	// Stacks enables access to Infrastructure as Code (IaC) stack management when set to true.
	// This includes managing Terraform stacks and other IaC
	// automation tools for infrastructure provisioning and management.
	// +kubebuilder:validation:Optional
	Stacks *bool `json:"stacks,omitempty"`

	// Security enables access to security management features when set to true.
	// This includes security scanning results, vulnerability management,
	// policy enforcement, and other security-related tools and dashboards.
	// +kubebuilder:validation:Optional
	Security *bool `json:"security,omitempty"`

	// Cost enables access to cost management and optimization features when set to true.
	// This includes cost tracking or resource optimization recommendations.
	// +kubebuilder:validation:Optional
	Cost *bool `json:"cost,omitempty"`
}

// Attributes converts the PersonaSidebar to Console API attributes.
func (in *PersonaSidebar) Attributes() *console.PersonaSidebarAttributes {
	if in == nil {
		return nil
	}

	return &console.PersonaSidebarAttributes{
		Audits:       in.Audits,
		Kubernetes:   in.Kubernetes,
		PullRequests: in.PullRequests,
		Settings:     in.Settings,
		Backups:      in.Backups,
		Stacks:       in.Stacks,
		Security:     in.Security,
		Cost:         in.Cost,
	}
}
