package v1alpha1

import (
	"fmt"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	defaultKubecostExtractorInterval = 2 * time.Hour
	defaultKubecostExtractorPort     = "9090"
)

func init() {
	SchemeBuilder.Register(&KubecostExtractor{}, &KubecostExtractorList{})
}

type KubecostExtractorSpec struct {
	// +kubebuilder:default="1h"
	// +kubebuilder:validation:Optional
	Interval           *string                `json:"interval,omitempty"`
	KubecostServiceRef corev1.ObjectReference `json:"kubecostServiceRef"`
	// +kubebuilder:validation:Optional
	KubecostPort *int32 `json:"kubecostPort,omitempty"`
	// RecommendationThreshold float value for example: `1.2 or 0.001`
	RecommendationThreshold string `json:"recommendationThreshold"`
	// +kubebuilder:validation:Optional
	RecommendationsSettings *RecommendationsSettings `json:"recommendationsSettings,omitempty"`
}

type RecommendationsSettings struct {
	ExcludeNamespaces  []string          `json:"excludeNamespaces,omitempty"`
	RequireAnnotations map[string]string `json:"requireAnnotations,omitempty"`
}

// KubecostExtractorList contains a list of [KubecostExtractor]
// +kubebuilder:object:root=true
type KubecostExtractorList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []KubecostExtractor `json:"items"`
}

// KubecostExtractor
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
type KubecostExtractor struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec KubecostExtractorSpec `json:"spec"`

	// Status of the MetricsAggregate
	Status Status `json:"status,omitempty"`
}

func (in *KubecostExtractorSpec) GetInterval() time.Duration {
	if in.Interval == nil {
		return defaultKubecostExtractorInterval
	}

	interval, err := time.ParseDuration(*in.Interval)
	if err != nil {
		return defaultKubecostExtractorInterval
	}

	return interval
}

func (in *KubecostExtractorSpec) GetPort() string {
	if in.KubecostPort == nil {
		return defaultKubecostExtractorPort
	}

	return fmt.Sprintf("%d", *in.KubecostPort)
}

func (in *KubecostExtractor) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}
