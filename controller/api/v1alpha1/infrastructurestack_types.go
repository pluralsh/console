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
	console "github.com/pluralsh/console-client-go"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// InfrastructureStackSpec defines the desired state of InfrastructureStack
type InfrastructureStackSpec struct {
	// Name of this Stack. If not provided InfrastructureStack's own name from InfrastructureStack.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Type specifies the tool to use to apply it
	// +kubebuilder:validation:Enum=TERRAFORM;ANSIBLE
	Type console.StackType `json:"type"`

	// RepositoryRef to source IaC from
	RepositoryRef corev1.ObjectReference `json:"repositoryRef"`

	// +kubebuilder:validation:Required
	ClusterRef corev1.ObjectReference `json:"clusterRef"`

	// Git reference w/in the repository where the IaC lives
	Git GitRef `json:"git"`

	// Whether you want Plural to manage the state of this stack
	// +kubebuilder:validation:Optional
	ManageState *bool `json:"manageState,omitempty"`

	// The working directory within the git spec you want to run commands in (useful for projects with external modules)
	// +kubebuilder:validation:Optional
	Workdir *string `json:"workdir,omitempty"`

	// JobSpec optional k8s job configuration for the job that will apply this stack
	// +kubebuilder:validation:Optional
	JobSpec *JobSpec `json:"jobSpec,omitempty"`

	// Configuration version/image config for the tool you're using
	Configuration StackConfiguration `json:"configuration"`

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

	// If true, detach the stack on CR deletion, leaving all cloud resources in-place.
	// +kubebuilder:validation:Optional
	Detach bool `json:"detach,omitempty"`

	// User email to use for default Plural authentication in this stack.
	// +kubebuilder:validation:Optional
	Actor *string `json:"actor,omitempty"`

	// +kubebuilder:validation:Optional
	ScmConnectionRef *corev1.ObjectReference `json:"scmConnectionRef,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// InfrastructureStack is the Schema for the infrastructurestacks API
type InfrastructureStack struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   InfrastructureStackSpec `json:"spec,omitempty"`
	Status Status                  `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// InfrastructureStackList contains a list of InfrastructureStack
type InfrastructureStackList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []InfrastructureStack `json:"items"`
}

func init() {
	SchemeBuilder.Register(&InfrastructureStack{}, &InfrastructureStackList{})
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
	Version string `json:"version"`
	// Hooks to run at various stages of the stack run
	// +kubebuilder:validation:Optional
	Hooks []*StackHook `json:"hooks,omitempty"`
}

type StackHook struct {
	// the command this hook will execute
	Cmd string `json:"cmd"`

	// optional arguments to pass to the command
	// +kubebuilder:validation:Optional
	Args []string `json:"args,omitempty"`

	// +kubebuilder:validation:Enum=INIT;PLAN;VERIFY;APPLY
	AfterStage console.StepStage `json:"afterStage"`
}

type StackEnvironment struct {
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

func (p *InfrastructureStack) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}
