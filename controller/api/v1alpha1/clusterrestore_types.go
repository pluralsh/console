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

type RestoreStatus string

const (
	RestoreStatusCreated    RestoreStatus = "CREATED"
	RestoreStatusPending    RestoreStatus = "PENDING"
	RestoreStatusSuccessful RestoreStatus = "SUCCESSFUL"
	RestoreStatusFailed     RestoreStatus = "FAILED"
)

// ClusterRestoreSpec defines the desired state of ClusterRestore
type ClusterRestoreSpec struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="ClusterBackup is immutable"
	ClusterBackupRef corev1.ObjectReference `json:"clusterBackupRef"`
}

// ClusterRestoreStatus defines the observed state of ClusterRestore
type ClusterRestoreStatus struct {
	// ID of the cluster restore in the Console API.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ID *string `json:"id,omitempty"`

	// +kubebuilder:validation:Enum=CREATED;PENDING;SUCCESSFUL;FAILED
	Status RestoreStatus `json:"status,omitempty"`

	// Represents the observations of ClusterRestore current state.
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ClusterRestore is the Schema for the clusterrestores API
type ClusterRestore struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterRestoreSpec   `json:"spec,omitempty"`
	Status ClusterRestoreStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ClusterRestoreList contains a list of ClusterRestore
type ClusterRestoreList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ClusterRestore `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ClusterRestore{}, &ClusterRestoreList{})
}

func (s *ClusterRestore) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

func (p *ClusterRestoreStatus) GetID() string {
	if !p.HasID() {
		return ""
	}

	return *p.ID
}

func (p *ClusterRestoreStatus) HasID() bool {
	return p.ID != nil && len(*p.ID) > 0
}
