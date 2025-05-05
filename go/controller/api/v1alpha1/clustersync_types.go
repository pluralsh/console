package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ClusterSyncSpec defines the desired state of ClusterSync
type ClusterSyncSpec struct {
	// Handle, if not provided name from object meta will be used.
	// +kubebuilder:validation:Optional
	Handle *string `json:"handle,omitempty"`

	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`

	// +kubebuilder:validation:Optional
	SyncSpec SyncSpec `json:"clusterSpec,omitempty"`
}

type SyncSpec struct {
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec ClusterSpec `json:"spec,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ClusterSync is the Schema for the clustersyncs API
type ClusterSync struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterSyncSpec `json:"spec,omitempty"`
	Status Status          `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ClusterSyncList contains a list of ClusterSync
type ClusterSyncList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ClusterSync `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ClusterSync{}, &ClusterSyncList{})
}

func (in *ClusterSync) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *ClusterSync) GetName() string {
	if in.Spec.Handle != nil && len(*in.Spec.Handle) > 0 {
		return *in.Spec.Handle
	}

	return in.Name
}
