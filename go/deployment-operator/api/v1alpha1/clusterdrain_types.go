package v1alpha1

import (
	"sort"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type FlowControl struct {
	Percentage     *int `json:"percentage,omitempty"`
	MaxConcurrency *int `json:"maxConcurrency,omitempty"`
}

// ClusterDrainSpec defines the desired state of ClusterDrain
type ClusterDrainSpec struct {
	FlowControl   FlowControl           `json:"flowControl"`
	LabelSelector *metav1.LabelSelector `json:"labelSelector,omitempty"`
}

// ClusterDrainStatus defines the observed state of ClusterDrain
type ClusterDrainStatus struct {
	// Represents the observations of a HealthConvert current state.
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
	Progress   []Progress         `json:"progress,omitempty"`
}

type Progress struct {
	Wave       int                      `json:"wave"`
	Percentage int                      `json:"percentage"`
	Count      int                      `json:"count"`
	Failures   []corev1.ObjectReference `json:"failures,omitempty"`
	Cursor     *corev1.ObjectReference  `json:"cursor,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ClusterDrain is the Schema for the ClusterDrain object
type ClusterDrain struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterDrainSpec   `json:"spec,omitempty"`
	Status ClusterDrainStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ClusterDrainList contains a list of ClusterDrain
type ClusterDrainList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ClusterDrain `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ClusterDrain{}, &ClusterDrainList{})
}

func (c *ClusterDrain) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&c.Status.Conditions, condition)
}

func (c *ClusterDrain) SetWaveProgress(newProgress Progress) bool {
	if c.Status.Progress == nil {
		c.Status.Progress = make([]Progress, 1)
	}
	existing := c.FindWaveProgress(newProgress.Wave)
	if existing == nil {
		c.Status.Progress = append(c.Status.Progress, newProgress)
		sort.Slice(c.Status.Progress, func(i, j int) bool {
			return c.Status.Progress[i].Wave < c.Status.Progress[j].Wave
		})
		return true
	}
	existing.Wave = newProgress.Wave
	existing.Percentage = newProgress.Percentage
	existing.Count = newProgress.Count
	existing.Failures = newProgress.Failures
	existing.Cursor = newProgress.Cursor

	return true
}

func (c *ClusterDrain) FindWaveProgress(wave int) *Progress {
	for i := range c.Status.Progress {
		if c.Status.Progress[i].Wave == wave {
			return &c.Status.Progress[i]
		}
	}

	return nil
}

func (p *Progress) SetStatus(failures []corev1.ObjectReference, cursor *corev1.ObjectReference) {
	p.Failures = failures
	p.Cursor = cursor
}
