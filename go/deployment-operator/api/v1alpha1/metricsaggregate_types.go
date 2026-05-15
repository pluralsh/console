package v1alpha1

import (
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&MetricsAggregate{}, &MetricsAggregateList{})
}

// MetricsAggregateList contains a list of [MetricsAggregate]
// +kubebuilder:object:root=true
type MetricsAggregateList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MetricsAggregate `json:"items"`
}

// MetricsAggregate
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
type MetricsAggregate struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Status of the MetricsAggregate
	// +kubebuilder:validation:Optional
	// +kubebuilder:printcolumn:name="Nodes",type=integer,JSONPath=".status.nodes",description="Number of Cluster Nodes"
	// +kubebuilder:printcolumn:name="MemoryTotalBytes",type=integer,JSONPath=".status.memoryTotalBytes",description="Memory total bytes"
	// +kubebuilder:printcolumn:name="MemoryAvailableBytes",type=integer,JSONPath=".status.memoryAvailableBytes",description="Memory available bytes"
	// +kubebuilder:printcolumn:name="MemoryUsedPercentage",type=integer,JSONPath=".status.memoryUsedPercentage",description="Memory used percentage"
	// +kubebuilder:printcolumn:name="CPUTotalMillicores",type=integer,JSONPath=".status.cpuTotalMillicores",description="CPU total millicores"
	// +kubebuilder:printcolumn:name="CPUAvailableMillicores",type=integer,JSONPath=".status.cpuAvailableMillicores",description="CPU available millicores"
	// +kubebuilder:printcolumn:name="CPUUsedPercentage",type=integer,JSONPath=".status.cpuUsedPercentage",description="CPU used percentage"
	Status MetricsAggregateStatus `json:"status,omitempty"`
}

type MetricsAggregateStatus struct {
	Nodes int `json:"nodes,omitempty"`
	// MemoryTotalBytes current memory usage in bytes
	MemoryTotalBytes int64 `json:"memoryTotalBytes,omitempty"`
	// MemoryAvailableBytes available memory for node
	MemoryAvailableBytes int64 `json:"memoryAvailableBytes,omitempty"`
	// MemoryUsedPercentage in percentage
	MemoryUsedPercentage int64 `json:"memoryUsedPercentage,omitempty"`
	// CPUTotalMillicores in m cores
	CPUTotalMillicores int64 `json:"cpuTotalMillicores,omitempty"`
	// CPUAvailableMillicores in m cores
	CPUAvailableMillicores int64 `json:"cpuAvailableMillicores,omitempty"`
	// CPUUsedPercentage in percentage
	CPUUsedPercentage int64 `json:"cpuUsedPercentage,omitempty"`

	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

func (in *MetricsAggregate) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}
