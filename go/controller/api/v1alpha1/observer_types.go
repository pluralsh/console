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
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&Observer{}, &ObserverList{})
}

//+kubebuilder:object:root=true

// ObserverList contains a list of Observer resources.
type ObserverList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Observer `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the Observer in the Console API"

// Observer monitors external data sources and triggers automated actions when changes are detected.
// It polls various targets like Helm repositories, OCI registries, Git repositories, or Kubernetes add-ons
// on a scheduled basis and executes predefined actions when new versions or updates are discovered.
// Common use cases include automatically creating pull requests when new chart versions are available or
// triggering pipeline deployments when container images are updated.
type Observer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the Observer, including the polling schedule,
	// target configuration, and actions to execute when changes are detected.
	Spec ObserverSpec `json:"spec,omitempty"`

	// Status represents the current state of this Observer resource, including
	// synchronization status with the Console API and last polling information.
	Status Status `json:"status,omitempty"`
}

// SetCondition sets a condition on the Observer status.
func (o *Observer) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&o.Status.Conditions, condition)
}

// Diff compares the current Observer configuration with its last known state to determine
// if changes have occurred. It returns whether the resource has changed, the new SHA hash,
// and any error that occurred during comparison.
func (o *Observer) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(o.Spec)
	if err != nil {
		return false, "", err
	}

	return !o.Status.IsSHAEqual(currentSha), currentSha, nil
}

// ObserverName returns the effective name to be used for this observer.
// It returns the explicitly configured name if provided, otherwise falls back to
// the Observer resource's own name from metadata.
func (o *Observer) ObserverName() string {
	if o.Spec.Name != nil && len(*o.Spec.Name) > 0 {
		return *o.Spec.Name
	}

	return o.Name
}

// Attributes converts the Observer spec to Console API attributes for upstream synchronization.
func (o *Observer) Attributes(target console.ObserverTargetAttributes, actions []*console.ObserverActionAttributes, projectID *string) console.ObserverAttributes {
	attributes := console.ObserverAttributes{
		Name:      o.ObserverName(),
		Crontab:   o.Spec.Crontab,
		Target:    target,
		Actions:   actions,
		ProjectID: projectID,
		Initial:   o.Spec.Initial,
	}
	return attributes
}

// ObserverSpec defines the desired state of Observer.
// It specifies what external source to monitor, when to poll it, and what actions
// to take when changes are detected, enabling automated workflows based on external updates.
type ObserverSpec struct {
	// Name specifies the name for this observer.
	// If not provided, the name from the resource metadata will be used.
	// This name is used for identification and logging purposes.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Crontab defines the polling schedule using standard cron syntax.
	// This determines how frequently the observer checks the target for updates.
	// Examples: "0 */6 * * *" (every 6 hours), "*/15 * * * *" (every 15 minutes).
	// +kubebuilder:validation:Required
	Crontab string `json:"crontab"`

	// Initial sets the baseline value for this observer to prevent duplicate actions on startup.
	// When specified, the observer will only trigger actions for values that are newer than this initial value.
	// This prevents unnecessary actions when the observer is first created or restarted.
	// +kubebuilder:validation:Optional
	Initial *string `json:"initial,omitempty"`

	// Target specifies the external source to monitor for changes.
	// This defines what type of resource to poll (Helm chart, OCI image, Git tags, etc.)
	// and the specific configuration needed to access that resource.
	// +kubebuilder:validation:Required
	Target ObserverTarget `json:"target"`

	// Actions define the automated responses to execute when new values are detected.
	// Each action specifies what should happen when the observer discovers an update,
	// such as creating pull requests or triggering pipeline deployments.
	// +kubebuilder:validation:Optional
	Actions []ObserverAction `json:"actions,omitempty"`

	// ProjectRef references the project this observer belongs to.
	// If not provided, the observer will use the default project.
	// This helps organize observers and control access permissions.
	// +kubebuilder:validation:Optional
	ProjectRef *v1.ObjectReference `json:"projectRef,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// ObserverAction defines an automated response to execute when the observer detects changes.
// Actions can create pull requests or trigger pipelines.
type ObserverAction struct {
	// Type specifies the kind of action to perform when changes are detected.
	// PIPELINE actions trigger pipeline context updates, while PR actions create pull requests
	// using PR automation templates with the discovered values.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=PIPELINE;PR
	Type console.ObserverActionType `json:"type"`

	// Configuration contains the specific settings for this action type.
	// The structure depends on the Type field - PR actions use PR configuration,
	// while PIPELINE actions use pipeline configuration.
	// +kubebuilder:validation:Required
	Configuration ObserverConfiguration `json:"configuration"`
}

// ObserverConfiguration contains type-specific configuration for observer actions.
// Only one configuration section should be populated based on the action type.
// This allows for different action types to have their own specialized settings.
type ObserverConfiguration struct {
	// Pr contains configuration for pull request actions.
	// Used when the action type is PR to automatically create pull requests
	// when new versions are detected by the observer.
	// +kubebuilder:validation:Optional
	Pr *ObserverPrAction `json:"pr,omitempty"`

	// Pipeline contains configuration for pipeline actions.
	// Used when the action type is PIPELINE to trigger pipeline context updates
	// when new versions are detected by the observer.
	// +kubebuilder:validation:Optional
	Pipeline *ObserverPipelineAction `json:"pipeline,omitempty"`
}

// ObserverPrAction defines configuration for automatically creating pull requests.
// When the observer detects new versions, it can generate pull requests using
// PR automation templates with the discovered values interpolated into the context.
type ObserverPrAction struct {
	// PrAutomationRef references the PR automation template to use for generating pull requests.
	// The automation template defines the repository, branch pattern, and file modifications
	// to apply when creating the pull request.
	// +kubebuilder:validation:Required
	PrAutomationRef v1.ObjectReference `json:"prAutomationRef"`

	// Repository overrides the repository slug for the referenced PR automation.
	// Use this when you want to target a different repository than the one
	// configured in the PR automation template.
	// +kubebuilder:validation:Optional
	Repository *string `json:"repository,omitempty"`

	// BranchTemplate provides a template for generating branch names.
	// Use $value to inject the observed value into the branch name.
	// Example: "update-chart-to-$value" becomes "update-chart-to-1.2.3".
	// +kubebuilder:validation:Optional
	BranchTemplate *string `json:"branchTemplate,omitempty"`

	// Context is a templated context that becomes the input for the PR automation.
	// Use $value to interpolate the observed value into the context data.
	// This context is passed to the PR automation for template rendering and file modifications.
	// +kubebuilder:validation:Optional
	Context runtime.RawExtension `json:"context,omitempty"`
}

// ObserverPipelineAction defines configuration for triggering pipeline context updates.
// When the observer detects new versions, it can update pipeline contexts to trigger
// deployments or other pipeline-driven workflows with the new values.
type ObserverPipelineAction struct {
	// PipelineRef references the pipeline to update when changes are detected.
	// The pipeline will receive a new context with the observed value,
	// potentially triggering deployment workflows or other pipeline stages.
	// +kubebuilder:validation:Required
	PipelineRef v1.ObjectReference `json:"pipelineRef"`

	// Context is a templated context that becomes the pipeline context.
	// Use $value to interpolate the observed value into the context data.
	// This context is applied to the pipeline to trigger appropriate actions.
	// +kubebuilder:validation:Optional
	Context runtime.RawExtension `json:"context,omitempty"`
}

// ObserverTarget defines the external source to monitor for changes.
// It specifies what type of resource to poll and how to interpret the results,
// supporting various sources like Helm repositories, OCI registries, and Git repositories.
type ObserverTarget struct {
	// Type specifies the kind of external source to monitor.
	// Each type has different configuration requirements and polling mechanisms.
	// Supported types include Helm charts, OCI images, Git tags, and Kubernetes add-ons.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=OCI;HELM;GIT;ADDON;EKS_ADDON
	Type console.ObserverTargetType `json:"type"`

	// Format is a regex pattern with a capture group for extracting version information.
	// Useful when version strings are embedded in larger release names or tags.
	// The first capture group is used as the version value.
	// Example: "app-v([0-9]+.[0-9]+.[0-9]+)" extracts "1.2.3" from "app-v1.2.3".
	// +kubebuilder:validation:Optional
	Format *string `json:"format,omitempty"`

	// Order determines how discovered versions are sorted and which one is selected.
	// SEMVER sorts by semantic version rules, while LATEST uses chronological ordering.
	// SEMVER is recommended for most use cases as it provides predictable version ordering.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=SEMVER;LATEST
	Order console.ObserverTargetOrder `json:"order"`

	// Helm contains configuration for monitoring Helm chart repositories.
	// Used when Type is HELM to specify the repository URL, chart name, and authentication.
	// +kubebuilder:validation:Optional
	Helm *ObserverHelm `json:"helm,omitempty"`

	// OCI contains configuration for monitoring OCI (container) registries.
	// Used when Type is OCI to specify the registry URL and authentication credentials.
	// +kubebuilder:validation:Optional
	OCI *ObserverOci `json:"oci,omitempty"`

	// Git contains configuration for monitoring Git repository tags.
	// Used when Type is GIT to specify which Git repository to monitor for new tags.
	// +kubebuilder:validation:Optional
	Git *ObserverGit `json:"git,omitempty"`

	// AddOn contains configuration for monitoring Plural add-on versions.
	// Used when Type is ADDON to specify which Kubernetes add-on to monitor for updates.
	// +kubebuilder:validation:Optional
	AddOn *ObserverAddOn `json:"addon,omitempty"`

	// EksAddOn contains configuration for monitoring AWS EKS add-on versions.
	// Used when Type is EKS_ADDON to specify which EKS add-on to monitor for updates.
	// +kubebuilder:validation:Optional
	EksAddOn *ObserverAddOn `json:"eksAddon,omitempty"`
}

// ObserverGit defines configuration for monitoring Git repository tags.
// This allows observing when new tags are created in a Git repository,
// typically used for monitoring application releases or infrastructure updates.
type ObserverGit struct {
	// GitRepositoryRef references the Git repository resource to monitor.
	// The repository must be configured in Plural Console with appropriate access credentials.
	// +kubebuilder:validation:Required
	GitRepositoryRef v1.ObjectReference `json:"gitRepositoryRef"`

	// Type specifies what Git resources to monitor within the repository.
	// Currently only TAGS is supported, which monitors for new Git tags.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=TAGS
	Type console.ObserverGitTargetType `json:"type"`

	// Filter specifies a regex to filter the git repository tags for the observed value.
	// +kubebuilder:validation:Optional
	Filter *ObserverGitFilter `json:"filter,omitempty"`
}

type ObserverGitFilter struct {
	// Regex specifies a regex to filter the git repository tags for the observed value.
	// Useful if you want to filter out tags within a larger monorepo or across multiple channels, eg: prod-1.2.3 vs. dev-1.2.3
	// +kubebuilder:validation:Optional
	Regex *string `json:"regex,omitempty"`
}

// ObserverHelm defines configuration for monitoring Helm chart repositories.
// This allows observing when new chart versions are published to Helm repositories,
// enabling automated updates when application or infrastructure charts are updated.
type ObserverHelm struct {
	// URL specifies the Helm repository URL to monitor.
	// This should be a valid Helm repository URL that contains the chart index.
	// The URL is immutable once set to ensure consistent monitoring.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="URL is immutable"
	URL string `json:"url"`

	// Chart specifies the name of the chart within the repository to monitor.
	// The observer will check for new versions of this specific chart.
	// +kubebuilder:validation:Required
	Chart string `json:"chart"`

	// Provider specifies the authentication provider type for the Helm repository.
	// Different providers support different authentication mechanisms optimized for their platforms.
	// +kubebuilder:validation:Optional
	// +kubebuilder:example:=AWS
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=BASIC;BEARER;GCP;AZURE;AWS
	Provider *console.HelmAuthProvider `json:"provider,omitempty"`

	// Auth contains authentication credentials for accessing the Helm repository.
	// Required for private repositories, the format depends on the Provider type.
	// +kubebuilder:validation:Optional
	Auth *HelmRepositoryAuth `json:"auth,omitempty"`
}

// ObserverOci defines configuration for monitoring OCI (container) registries.
// This allows observing when new container images or OCI artifacts are published,
// enabling automated updates when application images or infrastructure artifacts are updated.
type ObserverOci struct {
	// URL specifies the OCI registry URL to monitor.
	// This should include the full path to the specific repository or artifact.
	// The URL is immutable once set to ensure consistent monitoring.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="URL is immutable"
	URL string `json:"url"`

	// Provider specifies the authentication provider type for the OCI registry.
	// Different providers support different authentication mechanisms optimized for their platforms.
	// +kubebuilder:validation:Optional
	// +kubebuilder:example:=AWS
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=BASIC;BEARER;GCP;AZURE;AWS
	Provider *console.HelmAuthProvider `json:"provider,omitempty"`

	// Auth contains authentication credentials for accessing the OCI registry.
	// Required for private registries, the format depends on the Provider type.
	// +kubebuilder:validation:Optional
	Auth *HelmRepositoryAuth `json:"auth,omitempty"`
}

// ObserverAddOn defines configuration for monitoring Kubernetes add-on versions.
// This allows observing when new versions of Kubernetes add-ons are available,
// enabling automated updates while ensuring compatibility with specific Kubernetes versions.
type ObserverAddOn struct {
	// Name specifies the add-on to monitor for new versions.
	// This should match the add-on name as known to the monitoring system.
	// +kubebuilder:validation:Required
	Name string `json:"name"`

	// KubernetesVersion specifies the Kubernetes version for compatibility checking.
	// The observer will only consider add-on versions that are compatible with this Kubernetes version.
	// This helps ensure that suggested updates will work with your cluster.
	// +kubebuilder:validation:Optional
	KubernetesVersion *string `json:"kubernetesVersion,omitempty"`

	// KubernetesVersions specifies multiple Kubernetes versions for compatibility checking.
	// Useful when managing clusters with different Kubernetes versions or during upgrade periods.
	// The observer will only suggest add-on versions compatible with all specified versions.
	// +kubebuilder:validation:Optional
	KubernetesVersions []string `json:"kubernetesVersions,omitempty"`
}
