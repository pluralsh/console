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
	"sigs.k8s.io/controller-runtime/pkg/client"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&InfrastructureStack{}, &InfrastructureStackList{})
}

// InfrastructureStackList contains a list of InfrastructureStack
// +kubebuilder:object:root=true
type InfrastructureStackList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []InfrastructureStack `json:"items"`
}

// InfrastructureStack is the Schema for the infrastructurestacks API
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the InfrastructureStack in the Console API."
type InfrastructureStack struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   InfrastructureStackSpec `json:"spec,omitempty"`
	Status Status                  `json:"status,omitempty"`
}

// InfrastructureStackSpec defines the desired state of InfrastructureStack
type InfrastructureStackSpec struct {
	// Name of this Stack. If not provided InfrastructureStack's own name from InfrastructureStack.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Type specifies the tool to use to apply it
	// +kubebuilder:validation:Enum=TERRAFORM;ANSIBLE;CUSTOM
	// +kubebuilder:validation:Required
	Type console.StackType `json:"type"`

	// RepositoryRef to source IaC from
	// +kubebuilder:validation:Required
	RepositoryRef corev1.ObjectReference `json:"repositoryRef"`

	// +kubebuilder:validation:Required
	ClusterRef corev1.ObjectReference `json:"clusterRef"`

	// ProjectRef references project this stack belongs to.
	// If not provided, it will use the default project.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// Git reference w/in the repository where the IaC lives
	Git GitRef `json:"git"`

	// ManageState - whether you want Plural to manage the state of this stack
	// +kubebuilder:validation:Optional
	ManageState *bool `json:"manageState,omitempty"`

	// Workdir - the working directory within the git spec you want to run commands in (useful for projects with external modules)
	// +kubebuilder:validation:Optional
	Workdir *string `json:"workdir,omitempty"`

	// JobSpec optional k8s job configuration for the job that will apply this stack
	// +kubebuilder:validation:Optional
	JobSpec *JobSpec `json:"jobSpec,omitempty"`

	// Configuration version/image config for the tool you're using
	// +kubebuilder:validation:Optional
	Configuration *StackConfiguration `json:"configuration,omitempty"`

	// Configuration for cron generation of stack runs
	// +kubebuilder:validation:Optional
	Cron *StackCron `json:"cron,omitempty"`

	// Approval whether to require approval
	// +kubebuilder:validation:Optional
	Approval *bool `json:"approval,omitempty"`

	// Bindings contain read and write policies of this cluster
	// +kubebuilder:validation:Optional
	Bindings *Bindings `json:"bindings,omitempty"`

	// +kubebuilder:validation:Optional
	Environment []StackEnvironment `json:"environment,omitempty"`

	// Files reference to Secret with a key as a part of mount path and value as a content
	// +kubebuilder:validation:Optional
	Files []StackFile `json:"files,omitempty"`

	// Detach if true, detach the stack on CR deletion, leaving all cloud resources in-place.
	// +kubebuilder:validation:Optional
	Detach bool `json:"detach,omitempty"`

	// Actor - user email to use for default Plural authentication in this stack.
	// +kubebuilder:validation:Optional
	Actor *string `json:"actor,omitempty"`

	// +kubebuilder:validation:Optional
	ScmConnectionRef *corev1.ObjectReference `json:"scmConnectionRef,omitempty"`

	// +kubebuilder:validation:Optional
	StackDefinitionRef *corev1.ObjectReference `json:"stackDefinitionRef,omitempty"`

	// +kubebuilder:validation:Optional
	ObservableMetrics []ObservableMetric `json:"observableMetrics,omitempty"`

	// Tags used to filter stacks.
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	// Variables represents a file with variables in the stack run environment.
	// It will be automatically passed to the specific tool depending on the
	// stack Type (except [console.StackTypeCustom]).
	// +kubebuilder:validation:Optional
	Variables *runtime.RawExtension `json:"variables,omitempty"`

	// PolicyEngine is a configuration for applying policy enforcement to a stack.
	// +kubebuilder:validation:Optional
	PolicyEngine *PolicyEngine `json:"policyEngine,omitempty"`
}

type StackFile struct {
	MountPath string                      `json:"mountPath"`
	SecretRef corev1.LocalObjectReference `json:"secretRef"`
}

type StackConfiguration struct {
	// Image optional custom image you might want to use
	// +kubebuilder:validation:Optional
	Image *string `json:"image,omitempty"`
	// Version the semver of the tool you wish to use
	// +kubebuilder:validation:Optional
	Version *string `json:"version,omitempty"`
	// Tag is the docker image tag you wish to use
	// if you're customizing the version
	// +kubebuilder:validation:Optional
	Tag *string `json:"tag,omitempty"`
	// Hooks to run at various stages of the stack run
	// +kubebuilder:validation:Optional
	Hooks []*StackHook `json:"hooks,omitempty"`
}

type StackCron struct {
	// The crontab on which to spawn stack runs
	Crontab string `json:"crontab"`
	// Whether to automatically approve cron-spawned runs
	// +kubebuilder:validation:Optional
	AutoApprove *bool `json:"autoApprove"`
}

type StackHook struct {
	// the command this hook will execute
	// +kubebuilder:validation:Required
	Cmd string `json:"cmd"`

	// optional arguments to pass to the command
	// +kubebuilder:validation:Optional
	Args []string `json:"args,omitempty"`

	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=INIT;PLAN;VERIFY;APPLY;DESTROY
	AfterStage console.StepStage `json:"afterStage"`
}

type StackEnvironment struct {
	// +kubebuilder:validation:Required
	Name string `json:"name"`
	// +kubebuilder:validation:Optional
	Value *string `json:"value,omitempty"`
	// +kubebuilder:validation:Optional
	SecretKeyRef *corev1.SecretKeySelector `json:"secretKeyRef,omitempty"`
	// +kubebuilder:validation:Optional
	ConfigMapRef *corev1.ConfigMapKeySelector `json:"configMapRef,omitempty"`
}

func (p *InfrastructureStack) StackName() string {
	if p.Spec.Name != nil && len(*p.Spec.Name) > 0 {
		return *p.Spec.Name
	}

	return p.Name
}

func (p *InfrastructureStack) ProjectName() string {
	if p.Spec.ProjectRef == nil {
		return ""
	}

	return p.Spec.ProjectRef.Name
}

func (p *InfrastructureStack) HasProjectRef() bool {
	return p.Spec.ProjectRef != nil
}

func (p *InfrastructureStack) StackDefinitionObjectKey() client.ObjectKey {
	if p.Spec.StackDefinitionRef == nil {
		return client.ObjectKey{}
	}

	return client.ObjectKey{
		Name:      p.Spec.StackDefinitionRef.Name,
		Namespace: p.Spec.StackDefinitionRef.Namespace,
	}
}

func (p *InfrastructureStack) HasStackDefinitionRef() bool {
	return p.Spec.StackDefinitionRef != nil
}

func (p *InfrastructureStack) HasObservableMetrics() bool {
	return len(p.Spec.ObservableMetrics) > 0
}

func (p *InfrastructureStack) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

type ObservableMetric struct {
	// +kubebuilder:validation:Required
	Identifier string `json:"identifier"`

	// +kubebuilder:validation:Required
	ObservabilityProviderRef corev1.ObjectReference `json:"observabilityProviderRef"`
}

type PolicyEngine struct {
	// Type is the policy engine to use with this stack
	// +kubebuilder:validation:Enum=TRIVY
	// +kubebuilder:validation:Required
	Type console.PolicyEngineType `json:"type"`

	// MaxSeverity is the maximum allowed severity without failing the stack run
	// +kubebuilder:validation:Enum=UNKNOWN;LOW;MEDIUM;HIGH;CRITICAL;NONE
	// +kubebuilder:validation:Optional
	MaxSeverity *console.VulnSeverity `json:"maxSeverity,omitempty"`
}

func (in *PolicyEngine) Attributes() *console.PolicyEngineAttributes {
	if in == nil {
		return nil
	}

	return &console.PolicyEngineAttributes{
		Type:        in.Type,
		MaxSeverity: in.MaxSeverity,
	}
}
