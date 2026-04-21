package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// SentinelTriggerSpec defines the desired state of SentinelTrigger
type SentinelTriggerSpec struct {
	// SentinelRef is a reference to the Sentinel resource.
	// +kubebuilder:validation:Required
	SentinelRef corev1.ObjectReference `json:"sentinelRef"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// SentinelTrigger is the Schema for the sentineltriggers API
type SentinelTrigger struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   SentinelTriggerSpec `json:"spec,omitempty"`
	Status Status              `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// SentinelTriggerList contains a list of SentinelTrigger
type SentinelTriggerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []SentinelTrigger `json:"items"`
}

// SetCondition updates the status conditions of the SentinelTrigger.
func (p *SentinelTrigger) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

func init() {
	SchemeBuilder.Register(&SentinelTrigger{}, &SentinelTriggerList{})
}
