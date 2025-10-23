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
	"github.com/pluralsh/polly/algorithms"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&CustomStackRun{}, &CustomStackRunList{})
}

//+kubebuilder:object:root=true

// CustomStackRunList contains a list of CustomStackRun resources.
type CustomStackRunList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []CustomStackRun `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="CustomStackRun ID"

// CustomStackRun represents a custom stack run resource.
// It allows users to define custom commands that can be executed as part of a stack run.
type CustomStackRun struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CustomStackRunSpec `json:"spec,omitempty"`
	Status Status             `json:"status,omitempty"`
}

func (p *CustomStackRun) CustomStackRunName() string {
	if p.Spec.Name != nil && len(*p.Spec.Name) > 0 {
		return *p.Spec.Name
	}

	return p.Name
}

func (p *CustomStackRun) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

// CustomStackRunSpec defines the desired state of CustomStackRun.
type CustomStackRunSpec struct {
	// Name of this CustomStackRun. If not provided CustomStackRun's own name from CustomStackRun.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// StackRef is a reference to the stack this custom run belongs to.
	// +kubebuilder:validation:Optional
	StackRef *corev1.LocalObjectReference `json:"stackRef,omitempty"`

	// Documentation to explain what this custom run does.
	// +kubebuilder:validation:Optional
	Documentation *string `json:"documentation,omitempty"`

	// Commands to execute as part of this custom run.
	// +kubebuilder:validation:Optional
	Commands []CommandAttributes `json:"commands,omitempty"`

	// Configuration self-service configuration which will be presented in UI before triggering
	// +kubebuilder:validation:Optional
	Configuration []PrAutomationConfiguration `json:"configuration,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

type CommandAttributes struct {
	// Cmd is the command to execute
	// +kubebuilder:validation:Required
	Cmd string `json:"cmd"`

	// Args are the arguments to pass to the command.
	// +kubebuilder:validation:Optional
	Args []string `json:"args,omitempty"`

	// Dir is the working directory for the command.
	// +kubebuilder:validation:Optional
	Dir *string `json:"dir,omitempty"`
}

func (in *CommandAttributes) Attributes() *console.CommandAttributes {
	return &console.CommandAttributes{
		Cmd:  in.Cmd,
		Args: algorithms.Map(in.Args, func(b string) *string { return &b }),
		Dir:  in.Dir,
	}
}
