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
)

// PipelineContextSpec defines the desired state of PipelineContext
type PipelineContextSpec struct {
	// PipelineRef pointing to source Pipeline.
	// +kubebuilder:validation:Optional
	PipelineRef *corev1.ObjectReference `json:"pipelineRef,omitempty"`

	// Context is a Pipeline context
	Context runtime.RawExtension `json:"context,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// PipelineContext is the Schema for the pipelinecontexts API
type PipelineContext struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PipelineContextSpec `json:"spec,omitempty"`
	Status Status              `json:"status,omitempty"`
}

func (p *PipelineContext) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

//+kubebuilder:object:root=true

// PipelineContextList contains a list of PipelineContext
type PipelineContextList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PipelineContext `json:"items"`
}

func init() {
	SchemeBuilder.Register(&PipelineContext{}, &PipelineContextList{})
}
