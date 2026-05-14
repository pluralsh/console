package v1alpha1

import (
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the SentinelRunJob in the Console API."
//+kubebuilder:printcolumn:name="JobStatus",type="string",JSONPath=".status.jobStatus",description="Status of the Job created by this SentinelRunJob."

// SentinelRunJob is the Schema for the sentinel run job
type SentinelRunJob struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   SentinelRunJobSpec   `json:"spec,omitempty"`
	Status SentinelRunJobStatus `json:"status,omitempty"`
}

type SentinelRunJobSpec struct {
	// RunID from Console API
	RunID string `json:"runId"`
}

type SentinelRunJobStatus struct {
	Status `json:",inline"`

	// JobRef Reference to the created Job
	JobRef *v1.LocalObjectReference `json:"jobRef,omitempty"`

	// JobStatus is the status of the Job.
	JobStatus string `json:"jobStatus,omitempty"`
}

//+kubebuilder:object:root=true

// SentinelRunJobList contains a list of SentinelRunJob
type SentinelRunJobList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []SentinelRunJob `json:"items"`
}

func (s *SentinelRunJob) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&s.Status.Conditions, condition)
}

func init() {
	SchemeBuilder.Register(&SentinelRunJob{}, &SentinelRunJobList{})
}
