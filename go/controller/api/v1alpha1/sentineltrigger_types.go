package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// SentinelRunOverrides defines ad-hoc overrides applied when triggering a sentinel run.
type SentinelRunOverrides struct {
	// Tags are merged into integration test checks for this run.
	// +kubebuilder:validation:Optional
	Tags map[string]string `json:"tags,omitempty"`
}

// SentinelTriggerSpec defines the desired state of SentinelTrigger
type SentinelTriggerSpec struct {
	// SentinelRef is a reference to the Sentinel resource.
	// +kubebuilder:validation:Required
	SentinelRef corev1.ObjectReference `json:"sentinelRef"`

	// Overrides are applied when triggering the sentinel run.
	// +kubebuilder:validation:Optional
	Overrides *SentinelRunOverrides `json:"overrides,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced

// SentinelTrigger is the Schema for the sentinel triggers API
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
