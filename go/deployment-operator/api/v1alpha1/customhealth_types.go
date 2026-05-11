/*
Copyright 2024.

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
)

// CustomHealthSpec defines the desired state of CustomHealth
type CustomHealthSpec struct {
	Script string `json:"script,omitempty"`
}

// CustomHealthStatus defines the observed state of CustomHealth
type CustomHealthStatus struct {
	// Represents the observations of a HealthConvert current state.
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// CustomHealth is the Schema for the HealthConverts API
type CustomHealth struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CustomHealthSpec   `json:"spec,omitempty"`
	Status CustomHealthStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// CustomHealthList contains a list of CustomHealth
type CustomHealthList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []CustomHealth `json:"items"`
}

func init() {
	SchemeBuilder.Register(&CustomHealth{}, &CustomHealthList{})
}

func (c *CustomHealth) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&c.Status.Conditions, condition)
}
