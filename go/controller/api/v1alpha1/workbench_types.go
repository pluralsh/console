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
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&Workbench{}, &WorkbenchList{})
}

// +kubebuilder:object:root=true

// WorkbenchList contains a list of Workbench resources.
type WorkbenchList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Workbench `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the Workbench in the Console API."
// +kubebuilder:printcolumn:name="READONLY",type="boolean",JSONPath=".status.readonly",description="Flag indicating if the object is read-only"

// Workbench represents an AI workbench in Plural Console. It defines the system prompt,
// configuration, skills, and tools available for agent runs, and can reference a project,
// Git repository, and agent runtime.
type Workbench struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the Workbench.
	// +kubebuilder:validation:Required
	Spec WorkbenchSpec `json:"spec"`

	// Status represents the current state of this resource.
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// SetReadOnlyStatus sets the read-only status of the workbench.
func (in *Workbench) SetReadOnlyStatus(readOnly bool) {
	in.Status.ReadOnly = readOnly
}

// ConsoleID implements [PluralResource] interface.
func (in *Workbench) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName implements [PluralResource] interface.
func (in *Workbench) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}
	return in.Name
}

// Diff compares the current Workbench spec with its last known state.
func (in *Workbench) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}
	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// SetCondition sets a condition on the Workbench status.
func (in *Workbench) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *Workbench) Attributes(projectID, repositoryID, agentRuntimeID *string, toolIDs []string) *console.WorkbenchAttributes {
	return &console.WorkbenchAttributes{
		Name:           lo.ToPtr(in.ConsoleName()),
		Description:    in.Spec.Description,
		SystemPrompt:   in.Spec.SystemPrompt,
		ProjectID:      projectID,
		RepositoryID:   repositoryID,
		AgentRuntimeID: agentRuntimeID,
		Configuration:  in.Spec.Configuration.Attributes(),
		Skills:         in.Spec.Skills.Attributes(),
		ToolAssociations: lo.Map(toolIDs, func(id string, _ int) *console.WorkbenchToolAssociationAttributes {
			return &console.WorkbenchToolAssociationAttributes{ToolID: id}
		}),
	}
}

// WorkbenchSpec defines the desired state of a Workbench.
type WorkbenchSpec struct {
	// Name of the workbench. If not set, metadata.name is used.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Name *string `json:"name,omitempty"`

	// Description provides a human-readable explanation of the workbench's purpose.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	Description *string `json:"description,omitempty"`

	// SystemPrompt is the system prompt used for agent runs in this workbench.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	SystemPrompt *string `json:"systemPrompt,omitempty"`

	// ProjectRef references the project this workbench belongs to.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// RepositoryRef references the Git repository used for this workbench.
	// +kubebuilder:validation:Optional
	RepositoryRef *corev1.ObjectReference `json:"repositoryRef,omitempty"`

	// AgentRuntime is the name of the agent runtime in the Console.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	AgentRuntime *string `json:"agentRuntime,omitempty"`

	// Configuration defines workbench capabilities (coding and infrastructure).
	// +kubebuilder:validation:Optional
	Configuration *WorkbenchConfiguration `json:"configuration,omitempty"`

	// Skills define skills configuration (git ref and/or files) for the workbench.
	// +kubebuilder:validation:Optional
	Skills *WorkbenchSkills `json:"skills,omitempty"`

	// ToolRefs references WorkbenchTool resources to associate with this workbench.
	// +kubebuilder:validation:Optional
	ToolRefs []corev1.ObjectReference `json:"toolRefs,omitempty"`

	// Reconciliation settings for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// WorkbenchConfiguration defines workbench capabilities.
type WorkbenchConfiguration struct {
	// Coding configures coding agent capabilities (mode, repositories).
	// +kubebuilder:validation:Optional
	Coding *WorkbenchCodingConfig `json:"coding,omitempty"`

	// Infrastructure configures infrastructure capabilities (services, stacks, Kubernetes).
	// +kubebuilder:validation:Optional
	Infrastructure *WorkbenchInfrastructureConfig `json:"infrastructure,omitempty"`
}

func (c *WorkbenchConfiguration) Attributes() *console.WorkbenchConfigurationAttributes {
	if c == nil {
		return nil
	}

	return &console.WorkbenchConfigurationAttributes{
		Coding:         c.Coding.Attributes(),
		Infrastructure: c.Infrastructure.Attributes(),
	}
}

// WorkbenchCodingConfig defines coding agent settings.
type WorkbenchCodingConfig struct {
	// Mode is the agent run mode (e.g. analyze, write).
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum:=ANALYZE;WRITE
	Mode *console.AgentRunMode `json:"mode,omitempty"`

	// Repositories are allowed repository identifiers.
	// +kubebuilder:validation:Optional
	Repositories []string `json:"repositories,omitempty"`
}

func (c *WorkbenchCodingConfig) Attributes() *console.WorkbenchCodingAttributes {
	if c == nil {
		return nil
	}

	return &console.WorkbenchCodingAttributes{
		Mode:         c.Mode,
		Repositories: lo.ToSlicePtr(c.Repositories),
	}
}

// WorkbenchInfrastructureConfig defines infrastructure capabilities.
type WorkbenchInfrastructureConfig struct {
	// Services enables the services capability.
	// +kubebuilder:validation:Optional
	Services *bool `json:"services,omitempty"`

	// Stacks enables the stacks capability.
	// +kubebuilder:validation:Optional
	Stacks *bool `json:"stacks,omitempty"`

	// Kubernetes enables the Kubernetes capability.
	// +kubebuilder:validation:Optional
	Kubernetes *bool `json:"kubernetes,omitempty"`
}

func (c *WorkbenchInfrastructureConfig) Attributes() *console.WorkbenchInfrastructureAttributes {
	if c == nil {
		return nil
	}

	return &console.WorkbenchInfrastructureAttributes{
		Services:   c.Services,
		Stacks:     c.Stacks,
		Kubernetes: c.Kubernetes,
	}
}

// WorkbenchSkills defines skills configuration for a workbench.
type WorkbenchSkills struct {
	// Ref is the git reference for skills (ref, folder, files).
	// +kubebuilder:validation:Optional
	Ref *WorkbenchSkillsRef `json:"ref,omitempty"`

	// Files to include.
	// +kubebuilder:validation:Optional
	Files []string `json:"files,omitempty"`
}

func (s *WorkbenchSkills) Attributes() *console.WorkbenchSkillsAttributes {
	if s == nil {
		return nil
	}

	return &console.WorkbenchSkillsAttributes{
		Ref:   s.Ref.Attributes(),
		Files: lo.ToSlicePtr(s.Files),
	}
}

// WorkbenchSkillsRef is a git reference for skills.
type WorkbenchSkillsRef struct {
	// Ref is the Git reference (branch, tag, or commit)
	// understandable by `git checkout <ref>`.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:MinLength=1
	Ref string `json:"ref"`

	// Folder in the repository.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:MinLength=1
	Folder string `json:"folder"`

	// Files to include.
	// +kubebuilder:validation:Optional
	Files []string `json:"files,omitempty"`
}

func (r *WorkbenchSkillsRef) Attributes() *console.GitRefAttributes {
	if r == nil {
		return nil
	}

	return &console.GitRefAttributes{
		Ref:    r.Ref,
		Folder: r.Folder,
		Files:  r.Files,
	}
}
