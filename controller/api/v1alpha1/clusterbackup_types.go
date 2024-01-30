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

// ClusterBackupSpec defines the desired state of ClusterBackup
type ClusterBackupSpec struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Cluster is immutable"
	ClusterRef corev1.ObjectReference `json:"clusterRef"`
}

// ClusterBackupStatus defines the observed state of ClusterBackup
type ClusterBackupStatus struct {
	// ID of the cluster backup in the Console API.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ID *string `json:"id,omitempty"`

	// Represents the observations of ClusterBackup current state.
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ClusterBackup is the Schema for the clusterbackups API
type ClusterBackup struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterBackupSpec   `json:"spec,omitempty"`
	Status ClusterBackupStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ClusterBackupList contains a list of ClusterBackup
type ClusterBackupList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ClusterBackup `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ClusterBackup{}, &ClusterBackupList{})
}

func (s *ClusterBackup) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

func (p *ClusterBackupStatus) GetID() string {
	if !p.HasID() {
		return ""
	}

	return *p.ID
}

func (p *ClusterBackupStatus) HasID() bool {
	return p.ID != nil && len(*p.ID) > 0
}
