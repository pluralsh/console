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
	defaultKubecostPort              = "9090"
	defaultOpenCostPort              = "9003"

	defaultKubecostServiceName      = "kubecost-cost-analyzer"
	defaultKubecostServiceNamespace = "kubecost"
	defaultOpenCostServiceName      = "opencost"
	defaultOpenCostServiceNamespace = "opencost"

	kubecostAllocationPath  = "/model/allocation"
	kubecostClusterInfoPath = "/model/clusterInfo"
	openCostAllocationPath  = "/allocation"
	openCostClusterInfoPath = "/clusterInfo"
)

// CostProvider identifies which cost allocation backend to query.
type CostProvider string

const (
	CostProviderKubecost CostProvider = "Kubecost"
	CostProviderOpenCost CostProvider = "OpenCost"
)

func init() {
	SchemeBuilder.Register(&KubecostExtractor{}, &KubecostExtractorList{})
}

type KubecostExtractorSpec struct {
	// Provider selects which cost backend to query. Defaults to Kubecost.
	// +kubebuilder:default=Kubecost
	// +kubebuilder:validation:Enum=Kubecost;OpenCost
	// +kubebuilder:validation:Optional
	Provider *CostProvider `json:"provider,omitempty"`
	// +kubebuilder:default="1h"
	// +kubebuilder:validation:Optional
	Interval *string `json:"interval,omitempty"`
	// KubecostServiceRef points at the cost analyzer Service. When omitted, defaults
	// are chosen from provider: kubecost-cost-analyzer/kubecost or opencost/opencost.
	// +kubebuilder:validation:Optional
	KubecostServiceRef corev1.ObjectReference `json:"kubecostServiceRef,omitempty"`
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

func (in *KubecostExtractorSpec) GetProvider() CostProvider {
	if in.Provider == nil {
		return CostProviderKubecost
	}

	return *in.Provider
}

func (in *KubecostExtractorSpec) GetServiceRef() corev1.ObjectReference {
	if in.KubecostServiceRef.Name != "" {
		return in.KubecostServiceRef
	}

	switch in.GetProvider() {
	case CostProviderOpenCost:
		return corev1.ObjectReference{
			Name:      defaultOpenCostServiceName,
			Namespace: defaultOpenCostServiceNamespace,
		}
	default:
		return corev1.ObjectReference{
			Name:      defaultKubecostServiceName,
			Namespace: defaultKubecostServiceNamespace,
		}
	}
}

func (in *KubecostExtractorSpec) GetPort() string {
	if in.KubecostPort != nil {
		return fmt.Sprintf("%d", *in.KubecostPort)
	}

	switch in.GetProvider() {
	case CostProviderOpenCost:
		return defaultOpenCostPort
	default:
		return defaultKubecostPort
	}
}

func (in *KubecostExtractorSpec) GetAllocationPath() string {
	switch in.GetProvider() {
	case CostProviderOpenCost:
		return openCostAllocationPath
	default:
		return kubecostAllocationPath
	}
}

func (in *KubecostExtractorSpec) GetClusterInfoPath() string {
	switch in.GetProvider() {
	case CostProviderOpenCost:
		return openCostClusterInfoPath
	default:
		return kubecostClusterInfoPath
	}
}

func (in *KubecostExtractor) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}
