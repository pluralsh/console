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

// CustomStackRunSpec defines the desired state of CustomStackRun
type CustomStackRunSpec struct {
	// Name of this CustomStackRun. If not provided CustomStackRun's own name from CustomStackRun.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Stack is immutable"
	// StackRef to source InfrastructureStack
	StackRef corev1.LocalObjectReference `json:"stackRef"`

	// Documentation to explain what this will do
	// +kubebuilder:validation:Optional
	Documentation *string `json:"documentation,omitempty"`

	// Commands the commands for this custom run
	Commands []CommandAttributes `json:"commands,omitempty"`
	// Configuration self-service configuration which will be presented in UI before triggering
	Configuration []ConfigurationAttributes `json:"configuration,omitempty"`
}

type CommandAttributes struct {
	// the command this hook will execute
	Cmd string `json:"cmd"`
	// optional arguments to pass to the command
	// +kubebuilder:validation:Optional
	Args []string `json:"args,omitempty"`
	// +kubebuilder:validation:Optional
	Dir *string `json:"dir,omitempty"`
}

// ConfigurationAttributes the configuration item for creating a new pr
type ConfigurationAttributes struct {
	// +kubebuilder:validation:Enum=STRING;INT;BOOL;DOMAIN;BUCKET;FILE;FUNCTION;PASSWORD
	Type          console.ConfigurationType `json:"type"`
	Name          string                    `json:"name"`
	Default       *string                   `json:"default,omitempty"`
	Documentation *string                   `json:"documentation,omitempty"`
	Longform      *string                   `json:"longform,omitempty"`
	Placeholder   *string                   `json:"placeholder,omitempty"`
	Optional      *bool                     `json:"optional,omitempty"`
	Condition     *ConditionAttributes      `json:"condition,omitempty"`
}

// ConditionAttributes attributes for declaratively specifying whether a config item is relevant given prior config
type ConditionAttributes struct {
	// +kubebuilder:validation:Enum=NOT;GT;LT;EQ;GTE;LTE;PREFIX;SUFFIX
	Operation console.Operation `json:"operation"`
	Field     string            `json:"field"`
	Value     *string           `json:"value,omitempty"`
}

//+kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
//+kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="CustomStackRun ID"

// CustomStackRun is the Schema for the customstackruns API
type CustomStackRun struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CustomStackRunSpec `json:"spec,omitempty"`
	Status Status             `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// CustomStackRunList contains a list of CustomStackRun
type CustomStackRunList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []CustomStackRun `json:"items"`
}

func init() {
	SchemeBuilder.Register(&CustomStackRun{}, &CustomStackRunList{})
}

func (p *CustomStackRun) StackName() string {
	if p.Spec.Name != nil && len(*p.Spec.Name) > 0 {
		return *p.Spec.Name
	}

	return p.Name
}

func (p *CustomStackRun) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}
