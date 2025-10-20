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

func init() {
	SchemeBuilder.Register(&ClusterRestoreTrigger{}, &ClusterRestoreTriggerList{})
}

//+kubebuilder:object:root=true

// ClusterRestoreTriggerList contains a list of ClusterRestoreTrigger resources.
type ClusterRestoreTriggerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []ClusterRestoreTrigger `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// ClusterRestoreTrigger triggers cluster restore operations.
// It provides a declarative way to initiate cluster restore processes from existing backups.
//
// The ClusterRestoreTrigger works in conjunction with ClusterRestore resource to manage
// the complete backup and restore lifecycle for Kubernetes clusters in the Plural platform.
type ClusterRestoreTrigger struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state and configuration for the cluster restore trigger.
	Spec ClusterRestoreTriggerSpec `json:"spec,omitempty"`

	// Status represents the current state of the cluster restore trigger operation.
	Status Status `json:"status,omitempty"`
}

// SetCondition updates the status conditions of the ClusterRestoreTrigger.
func (p *ClusterRestoreTrigger) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

// ClusterRestoreTriggerSpec defines the desired state and configuration for a ClusterRestoreTrigger.
// It specifies which backup should be restored and provides the necessary references
// to locate and access the backup data for the restore operation.
type ClusterRestoreTriggerSpec struct {
	// ClusterRestoreRef is a reference to the ClusterRestore resource that contains
	// the backup data and configuration for the restore operation.
	//
	// This reference should point to a valid ClusterRestore resource that has been
	// successfully created and contains the backup data needed for restoration.
	//
	// +kubebuilder:validation:Optional
	ClusterRestoreRef *corev1.ObjectReference `json:"clusterRestoreRef,omitempty"`
}
