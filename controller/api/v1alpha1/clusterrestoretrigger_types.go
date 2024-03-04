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
)

// ClusterRestoreTriggerSpec defines the desired state of ClusterRestoreTrigger
type ClusterRestoreTriggerSpec struct {
	// ClusterRestoreRef pointing to source ClusterRestore.
	// +kubebuilder:validation:Optional
	ClusterRestoreRef *corev1.ObjectReference `json:"clusterRestoreRef,omitempty"`
}

// ClusterRestoreTriggerStatus defines the observed state of ClusterRestoreTrigger
type ClusterRestoreTriggerStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ClusterRestoreTrigger is the Schema for the clusterrestoretriggers API
type ClusterRestoreTrigger struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterRestoreTriggerSpec `json:"spec,omitempty"`
	Status Status                    `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ClusterRestoreTriggerList contains a list of ClusterRestoreTrigger
type ClusterRestoreTriggerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ClusterRestoreTrigger `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ClusterRestoreTrigger{}, &ClusterRestoreTriggerList{})
}

func (p *ClusterRestoreTrigger) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}
