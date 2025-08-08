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

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&ClusterRestore{}, &ClusterRestoreList{})
}

//+kubebuilder:object:root=true

// ClusterRestoreList contains a list of ClusterRestore resources.
type ClusterRestoreList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []ClusterRestore `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// ClusterRestore manages the restoration of cluster data from backup snapshots.
// Orchestrates the recovery process for Kubernetes resources.
type ClusterRestore struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterRestoreSpec   `json:"spec,omitempty"`
	Status ClusterRestoreStatus `json:"status,omitempty"`
}

func (s *ClusterRestore) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

// ClusterRestoreSpec defines the desired state of ClusterRestore.
// It specifies the backup to restore from, including the backup ID, name, namespace, and cluster reference.
type ClusterRestoreSpec struct {
	// BackupID is an ID of the backup to restore.
	// If BackupID is specified, then BackupName, BackupNamespace, and BackupClusterRef are not needed.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="BackupID is immutable"
	BackupID *string `json:"backupID"`

	// BackupName is a name of the backup to restore.
	// BackupNamespace and BackupClusterRef have to be specified as well with it.
	// If BackupName, BackupNamespace, and BackupCluster are specified, then BackupID is not needed.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="BackupName is immutable"
	BackupName *string `json:"backupName"`

	// BackupNamespace is a namespace of the backup to restore.
	// BackupName and BackupClusterRef have to be specified as well with it.
	// If BackupName, BackupNamespace, and BackupCluster are specified, then BackupID is not needed.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="BackupNamespace is immutable"
	BackupNamespace *string `json:"backupNamespace"`

	// BackupClusterID is an ID of a cluster where the backup to restore is located.
	// BackupName and BackupNamespace have to be specified as well with it.
	// If BackupName, BackupNamespace, and BackupClusterRef are specified, then BackupID is not needed.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="BackupClusterRef is immutable"
	BackupClusterRef *corev1.ObjectReference `json:"backupClusterRef"`
}

// ClusterRestoreStatus represents the observed state of a ClusterRestore operation.
// Tracks the progress, completion status, and any issues encountered during the restoration process.
type ClusterRestoreStatus struct {
	// ID of the cluster restore in the Console API.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ID *string `json:"id,omitempty"`

	// +kubebuilder:validation:Enum=CREATED;PENDING;SUCCESSFUL;FAILED
	Status console.RestoreStatus `json:"status,omitempty"`

	// Represents the observations of ClusterRestore current state.
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
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
