package common

import (
	"context"
	"fmt"
	"strings"

	configv1 "github.com/openshift/api/config/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	metricsapi "k8s.io/metrics/pkg/apis/metrics"
	"k8s.io/metrics/pkg/apis/metrics/v1beta1"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
)

func ParseAPIVersion(apiVersion string) (group, version string) {
	parts := strings.Split(apiVersion, "/")
	if len(parts) == 2 {
		group = parts[0]
		version = parts[1]
	}

	if len(parts) == 1 {
		version = parts[0]
	}

	return
}

type ResourceMetricsInfo struct {
	Name      string
	Metrics   corev1.ResourceList
	Available corev1.ResourceList
}

var supportedMetricsAPIVersions = []string{
	"v1beta1",
}

func GetMetricsAggregateStatus(ctx context.Context, client k8sClient.Client, metricsClient metricsclientset.Interface, metricsAPIAvailable bool) (*v1alpha1.MetricsAggregateStatus, error) {
	status := &v1alpha1.MetricsAggregateStatus{}
	nodeList := &corev1.NodeList{}
	if err := client.List(ctx, nodeList); err != nil {
		return nil, err
	}

	availableResources := make(map[string]corev1.ResourceList)
	for _, n := range nodeList.Items {
		// Total number, contains system reserved resources
		availableResources[n.Name] = n.Status.Capacity
		memCap := n.Status.Capacity.Memory()
		if memCap != nil {
			status.MemoryAvailableBytes += memCap.Value()
		}
		cpuCap := n.Status.Capacity.Cpu()
		if cpuCap != nil {
			status.CPUAvailableMillicores += cpuCap.MilliValue()
		}
	}
	status.Nodes = len(nodeList.Items)

	if metricsAPIAvailable {
		nodeDeploymentNodesMetrics := make([]v1beta1.NodeMetrics, 0)
		allNodeMetricsList, err := metricsClient.MetricsV1beta1().NodeMetricses().List(ctx, metav1.ListOptions{})
		if err != nil {
			return nil, err
		}

		for _, m := range allNodeMetricsList.Items {
			if _, ok := availableResources[m.Name]; ok {
				nodeDeploymentNodesMetrics = append(nodeDeploymentNodesMetrics, m)
			}
		}
		nodeMetrics, err := ConvertNodeMetrics(nodeDeploymentNodesMetrics, availableResources)
		if err != nil {
			return nil, err
		}
		// save metrics
		var cpuAvailableMillicores, cpuTotalMillicores, memoryAvailableBytes, memoryTotalBytes int64
		for _, nm := range nodeMetrics {
			cpuAvailableMillicores += nm.CPUAvailableMillicores
			cpuTotalMillicores += nm.CPUTotalMillicores
			memoryAvailableBytes += nm.MemoryAvailableBytes
			memoryTotalBytes += nm.MemoryTotalBytes
		}
		status.CPUAvailableMillicores = cpuAvailableMillicores
		status.CPUTotalMillicores = cpuTotalMillicores
		status.MemoryAvailableBytes = memoryAvailableBytes
		status.MemoryTotalBytes = memoryTotalBytes

		fraction := float64(status.CPUTotalMillicores) / float64(status.CPUAvailableMillicores) * 100
		status.CPUUsedPercentage = int64(fraction)
		fraction = float64(status.MemoryTotalBytes) / float64(status.MemoryAvailableBytes) * 100
		status.MemoryUsedPercentage = int64(fraction)
	}

	return status, nil
}

func ConvertNodeMetrics(metrics []v1beta1.NodeMetrics, availableResources map[string]corev1.ResourceList) ([]v1alpha1.MetricsAggregateStatus, error) {
	nodeMetrics := make([]v1alpha1.MetricsAggregateStatus, 0)

	if metrics == nil {
		return nil, fmt.Errorf("metric list can not be nil")
	}

	for _, m := range metrics {
		nodeMetric := v1alpha1.MetricsAggregateStatus{}

		resourceMetricsInfo := ResourceMetricsInfo{
			Name:      m.Name,
			Metrics:   m.Usage.DeepCopy(),
			Available: availableResources[m.Name],
		}

		if available, found := resourceMetricsInfo.Available[corev1.ResourceCPU]; found {
			quantityCPU := resourceMetricsInfo.Metrics[corev1.ResourceCPU]
			// cpu in mili cores
			nodeMetric.CPUTotalMillicores = quantityCPU.MilliValue()
			nodeMetric.CPUAvailableMillicores = available.MilliValue()
		}

		if available, found := resourceMetricsInfo.Available[corev1.ResourceMemory]; found {
			quantityM := resourceMetricsInfo.Metrics[corev1.ResourceMemory]
			// memory in bytes
			nodeMetric.MemoryTotalBytes = quantityM.Value()     // in Bytes
			nodeMetric.MemoryAvailableBytes = available.Value() // in Bytes
		}
		nodeMetrics = append(nodeMetrics, nodeMetric)
	}

	return nodeMetrics, nil
}

func SupportedMetricsAPIVersionAvailable(apiGroups []schema.GroupVersion) bool {
	for _, group := range apiGroups {
		if group.Group != metricsapi.GroupName {
			continue
		}

		for _, version := range supportedMetricsAPIVersions {
			if group.Version == version {
				return true
			}
		}
	}

	return false
}

func IsRunningOnOpenShift(apiGroups []schema.GroupVersion) bool {
	for _, group := range apiGroups {
		if group.Group == "config.openshift.io" {
			return true
		}
	}

	return false
}

func GetOpenShiftVersion(c k8sClient.Client) (string, error) {
	cv := &configv1.ClusterVersion{}
	err := c.Get(context.Background(), k8sClient.ObjectKey{Name: "version"}, cv)
	if err != nil {
		return "", err
	}

	// Try to find the latest completed version in history
	for _, hist := range cv.Status.History {
		if hist.State == configv1.CompletedUpdate {
			return hist.Version, nil
		}
	}

	// Fallback: use desired version
	return cv.Status.Desired.Version, nil
}
