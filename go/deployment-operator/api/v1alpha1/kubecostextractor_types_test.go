package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestKubecostExtractorSpec_GetProvider(t *testing.T) {
	t.Run("defaults to kubecost", func(t *testing.T) {
		spec := KubecostExtractorSpec{}
		assert.Equal(t, CostProviderKubecost, spec.GetProvider())
	})

	t.Run("returns configured provider", func(t *testing.T) {
		spec := KubecostExtractorSpec{Provider: ptr(CostProviderOpenCost)}
		assert.Equal(t, CostProviderOpenCost, spec.GetProvider())
	})
}

func TestKubecostExtractorSpec_GetPort(t *testing.T) {
	t.Run("defaults kubecost port", func(t *testing.T) {
		spec := KubecostExtractorSpec{}
		assert.Equal(t, defaultKubecostPort, spec.GetPort())
	})

	t.Run("defaults opencost port", func(t *testing.T) {
		spec := KubecostExtractorSpec{Provider: ptr(CostProviderOpenCost)}
		assert.Equal(t, defaultOpenCostPort, spec.GetPort())
	})

	t.Run("uses explicit port", func(t *testing.T) {
		port := int32(8080)
		spec := KubecostExtractorSpec{KubecostPort: &port}
		assert.Equal(t, "8080", spec.GetPort())
	})
}

func TestKubecostExtractorSpec_GetPaths(t *testing.T) {
	t.Run("kubecost paths", func(t *testing.T) {
		spec := KubecostExtractorSpec{}
		assert.Equal(t, kubecostAllocationPath, spec.GetAllocationPath())
		assert.Equal(t, kubecostClusterInfoPath, spec.GetClusterInfoPath())
	})

	t.Run("opencost paths", func(t *testing.T) {
		spec := KubecostExtractorSpec{Provider: ptr(CostProviderOpenCost)}
		assert.Equal(t, openCostAllocationPath, spec.GetAllocationPath())
		assert.Equal(t, openCostClusterInfoPath, spec.GetClusterInfoPath())
	})
}

func TestKubecostExtractorSpec_GetServiceRef(t *testing.T) {
	t.Run("uses explicit service ref", func(t *testing.T) {
		spec := KubecostExtractorSpec{
			Provider: ptr(CostProviderOpenCost),
			KubecostServiceRef: corev1.ObjectReference{
				Name:      "custom",
				Namespace: "custom-ns",
			},
		}
		assert.Equal(t, corev1.ObjectReference{Name: "custom", Namespace: "custom-ns"}, spec.GetServiceRef())
	})

	t.Run("defaults kubecost service", func(t *testing.T) {
		spec := KubecostExtractorSpec{}
		assert.Equal(t, corev1.ObjectReference{
			Name:      defaultKubecostServiceName,
			Namespace: defaultKubecostServiceNamespace,
		}, spec.GetServiceRef())
	})

	t.Run("defaults opencost service", func(t *testing.T) {
		spec := KubecostExtractorSpec{Provider: ptr(CostProviderOpenCost)}
		assert.Equal(t, corev1.ObjectReference{
			Name:      defaultOpenCostServiceName,
			Namespace: defaultOpenCostServiceNamespace,
		}, spec.GetServiceRef())
	})
}

func ptr[T any](v T) *T {
	return &v
}
