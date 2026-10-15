package store_test

import (
	"context"
	"fmt"
	"sort"
	"testing"
	"time"

	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/api"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
	"github.com/pluralsh/console/go/polly/algorithms"
)

func createComponentAttributes(uid string, parentUID *string, option ...CreateComponentAttributesOption) client.ComponentChildAttributes {
	result := client.ComponentChildAttributes{
		UID:       uid,
		ParentUID: parentUID,
		Group:     lo.ToPtr(testGroup),
		Version:   testVersion,
		Kind:      testKind,
		Namespace: lo.ToPtr(testNamespace),
		Name:      testName,
		State:     lo.ToPtr(client.ComponentStateRunning),
	}

	for _, opt := range option {
		opt(&result)
	}

	return result
}

type CreateComponentAttributesOption func(component *client.ComponentChildAttributes)

func WithAttributesKind(kind string) CreateComponentAttributesOption {
	return func(component *client.ComponentChildAttributes) {
		component.Kind = kind
	}
}

func WithAttributesNamespace(namespace string) CreateComponentAttributesOption {
	return func(component *client.ComponentChildAttributes) {
		component.Namespace = &namespace
	}
}

func WithAttributesName(name string) CreateComponentAttributesOption {
	return func(component *client.ComponentChildAttributes) {
		component.Name = name
	}
}

func WithAttributesState(state client.ComponentState) CreateComponentAttributesOption {
	return func(component *client.ComponentChildAttributes) {
		component.State = &state
	}
}

func TestComponentInsights(t *testing.T) {
	t.Run("should retrieve expected component insights without errors", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		// Define test components with various states
		testComponents := []client.ComponentChildAttributes{
			// Running components
			createComponentAttributes("app-frontend-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("app-frontend-1")),
			createComponentAttributes("app-backend-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("app-backend-1")),
			createComponentAttributes("app-database-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("app-database-1")),

			// Running components chain (ignored because of depth level > 4)
			createComponentAttributes("app-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("app-1")),
			createComponentAttributes("app-child-1", lo.ToPtr("app-1"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("app-child-1")),
			createComponentAttributes("app-child-2", lo.ToPtr("app-child-1"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("app-child-2")),
			createComponentAttributes("app-child-3", lo.ToPtr("app-child-2"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("app-child-3")),
			createComponentAttributes("app-child-4", lo.ToPtr("app-child-3"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-child-4")),

			// 1-level Failed components
			createComponentAttributes("app-redis-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-redis-1")),
			createComponentAttributes("app-worker-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-worker-1")),

			// Pending component
			createComponentAttributes("app-migration-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-migration-1")),

			// Ingress (failed) -> Certificate (failed)
			createComponentAttributes("app-ingress-1", nil, WithAttributesKind("Ingress"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-ingress-1")),
			createComponentAttributes("app-certificate-1", lo.ToPtr("app-ingress-1"), WithAttributesKind("Certificate"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-certificate-1")),

			// Ingress (pending) -> Certificate (failed): the Certificate is the root of its own failure, the Ingress is not failing
			createComponentAttributes("app-ingress-2", nil, WithAttributesKind("Ingress"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-ingress-2")),
			createComponentAttributes("app-certificate-2", lo.ToPtr("app-ingress-2"), WithAttributesKind("Certificate"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-certificate-2")),

			// StatefulSet (failed)
			createComponentAttributes("app-statefulset-1", nil, WithAttributesKind("StatefulSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-statefulset-1")),

			// DaemonSet (failed)
			createComponentAttributes("app-daemonset-1", nil, WithAttributesKind("DaemonSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-daemonset-1")),

			// Deployment (pending) -> Pod (failed)
			createComponentAttributes("app-deployment-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-deployment-1")),
			createComponentAttributes("app-pod-1", lo.ToPtr("app-deployment-1"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-pod-1")),

			// Widget CR (pending) -> Deployment (pending) -> Pod (failed)
			createComponentAttributes("app-crd-1", nil, WithAttributesKind("Widget"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-crd-1")),
			createComponentAttributes("app-deployment-2", lo.ToPtr("app-crd-1"), WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-deployment-2")),
			createComponentAttributes("app-pod-2", lo.ToPtr("app-deployment-2"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-pod-2")),

			// Widget CR (failed) -> Deployment (failed) -> Pod (failed)
			createComponentAttributes("app-crd-2", nil, WithAttributesKind("Widget"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-crd-2")),
			createComponentAttributes("app-deployment-3", lo.ToPtr("app-crd-2"), WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-deployment-3")),
			createComponentAttributes("app-pod-3", lo.ToPtr("app-deployment-3"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-pod-3")),

			// Widget CR (failed) -> Deployment (failed) -> ReplicaSet (failed) -> Pod (failed)
			createComponentAttributes("app-crd-3", nil, WithAttributesKind("Widget"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-crd-3")),
			createComponentAttributes("app-deployment-4", lo.ToPtr("app-crd-3"), WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-deployment-4")),
			createComponentAttributes("app-replicaset-1", lo.ToPtr("app-deployment-4"), WithAttributesKind("ReplicaSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-replicaset-1")),
			createComponentAttributes("app-pod-4", lo.ToPtr("app-replicaset-1"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-pod-4")),

			// Deployment (pending) -> (ReplicaSet (pending) -> Pod (failed)) | Secret (running)
			createComponentAttributes("app-deployment-5", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-deployment-5")),
			createComponentAttributes("app-replicaset-2", lo.ToPtr("app-deployment-5"), WithAttributesKind("ReplicaSet"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-replicaset-2")),
			createComponentAttributes("app-pod-5", lo.ToPtr("app-replicaset-2"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-pod-5")),
			createComponentAttributes("app-secret-1", lo.ToPtr("app-deployment-5"), WithAttributesKind("Secret"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("app-secret-1")),
		}

		expectedComponents := []string{
			"app-redis-1",
			"app-worker-1",
			"app-ingress-1",
			"app-certificate-1",
			"app-certificate-2",
			"app-statefulset-1",
			"app-daemonset-1",
			"app-deployment-1",
			"app-deployment-2",
			"app-crd-2",
			"app-deployment-3",
			"app-crd-3",
			"app-deployment-4",
			"app-deployment-5",
		}

		// Insert all test components into cache
		for _, tc := range testComponents {
			err := storeInstance.SaveComponentAttributes(tc)
			require.NoError(t, err, "Failed to add component %s to cache", tc.UID)
		}

		// Get component insights
		insights, err := storeInstance.GetComponentInsights()
		require.NoError(t, err, "Failed to get component insights")

		actualNames := algorithms.Map(
			insights,
			func(i client.ClusterInsightComponentAttributes) string { return i.Name },
		)

		// Verify expected components in insights
		// Sort both arrays to ensure order-independent comparison
		sort.Strings(actualNames)
		sort.Strings(expectedComponents)

		require.Equal(t,
			expectedComponents,
			actualNames,
			"Expected components not found in insights",
		)
	})

	t.Run("should properly assign priorities based on component kind", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		// Define test components with various kinds to test priority assignment
		testComponents := []client.ComponentChildAttributes{
			// Apps are never above MEDIUM on their own: an app's Ingress or Certificate is MEDIUM
			createComponentAttributes("ingress-1", nil, WithAttributesKind("Ingress"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("ingress-1")),
			createComponentAttributes("certificate-1", nil, WithAttributesKind("Certificate"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("certificate-1")),
			createComponentAttributes("cert-manager-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("cert-manager-webhook"), WithAttributesNamespace("cert-manager")),
			createComponentAttributes("coredns-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("coredns")),

			// Core components, without replica counts a failure is HIGH. A mostly down one is CRITICAL
			createComponentAttributes("statefulset-1", nil, WithAttributesKind("StatefulSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("statefulset-1")),
			createComponentAttributes("node-exporter", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("node-exporter")),

			// Third party workloads, whatever their kind
			createComponentAttributes("daemonset-1", nil, WithAttributesKind("DaemonSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("daemonset-1")),

			createComponentAttributes("deployment-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("deployment-1")),
		}

		expectedComponentPriorityMap := map[string]client.InsightComponentPriority{
			"ingress-1":            client.InsightComponentPriorityMedium,
			"certificate-1":        client.InsightComponentPriorityMedium,
			"cert-manager-webhook": client.InsightComponentPriorityHigh,
			"coredns":              client.InsightComponentPriorityHigh,
			"statefulset-1":        client.InsightComponentPriorityLow,
			"node-exporter":        client.InsightComponentPriorityLow,
			"daemonset-1":          client.InsightComponentPriorityLow,
			"deployment-1":         client.InsightComponentPriorityLow,
		}

		// Insert all test components into cache
		for _, tc := range testComponents {
			err := storeInstance.SaveComponentAttributes(tc)
			require.NoError(t, err, "Failed to add component %s to cache", tc.UID)
		}

		// Get component insights
		insights, err := storeInstance.GetComponentInsights()
		require.NoError(t, err, "Failed to get component insights")

		// Build a map of component name to priority for easier testing
		priorityMap := make(map[string]client.InsightComponentPriority)
		for _, insight := range insights {
			priorityMap[insight.Name] = *insight.Priority
		}

		for name, expectedPriority := range expectedComponentPriorityMap {
			assert.Equal(t, expectedPriority, priorityMap[name], "Priority for %s should be %s", name, expectedPriority)
		}
	})

	t.Run("should assign priorities based on token matches in resource names and namespaces", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		// Define test components with variations of similar names to test fuzzy matching
		testComponents := []client.ComponentChildAttributes{
			// Components with names very similar to critical priority resources
			createComponentAttributes("cert-manager-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("cert-manager"), WithAttributesNamespace("kube-system")),
			createComponentAttributes("coredns-similar", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("core-dns"), WithAttributesNamespace("kube-system")),
			createComponentAttributes("istio-ingressgateway", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("istio-ingressgateway"), WithAttributesNamespace("istio-system")),
			createComponentAttributes("linkerd-proxy", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("linkerd-proxy"), WithAttributesNamespace("linkerd")),
			createComponentAttributes("ebs-csi-node", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("ebs-csi-node"), WithAttributesNamespace("kube-system")),
			createComponentAttributes("gce-pd-csi-controller", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("gce-pd-csi-controller-sa"), WithAttributesNamespace("kube-system")),

			// Components with namespaces containing priority keywords
			createComponentAttributes("app-in-cert-manager", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-in-sensitive-ns-1"), WithAttributesNamespace("cert-manager")),
			createComponentAttributes("app-in-kube-system", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-in-sensitive-ns-2"), WithAttributesNamespace("kube-system")),

			// Names that only share some words with a high priority resource are not matched
			createComponentAttributes("node-exporter-similar", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("node-metrics-exporter"), WithAttributesNamespace("monitoring")),

			// Components with no special priority that could be slightly similar to other resources
			createComponentAttributes("app-similar-to-istio", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("iso-ist-app"), WithAttributesNamespace("default")),
			createComponentAttributes("app-similar-to-cert-manager", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("custom-cert-provisioner"), WithAttributesNamespace("default")),
		}

		expectedComponentPriorityMap := map[string]client.InsightComponentPriority{
			// everything that belongs to a core component or namespace is HIGH without replica counts
			"cert-manager":             client.InsightComponentPriorityHigh,
			"core-dns":                 client.InsightComponentPriorityHigh,
			"istio-ingressgateway":     client.InsightComponentPriorityHigh,
			"linkerd-proxy":            client.InsightComponentPriorityHigh,
			"ebs-csi-node":             client.InsightComponentPriorityHigh,
			"gce-pd-csi-controller-sa": client.InsightComponentPriorityHigh,
			"app-in-sensitive-ns-1":    client.InsightComponentPriorityHigh,
			"app-in-sensitive-ns-2":    client.InsightComponentPriorityHigh,
			"node-metrics-exporter":    client.InsightComponentPriorityLow,
			"iso-ist-app":              client.InsightComponentPriorityLow,
			"custom-cert-provisioner":  client.InsightComponentPriorityLow,
		}

		// Insert all test components into cache
		for _, tc := range testComponents {
			err := storeInstance.SaveComponentAttributes(tc)
			require.NoError(t, err, "Failed to add component %s to cache", tc.UID)
		}

		// Get component insights
		insights, err := storeInstance.GetComponentInsights()
		require.NoError(t, err, "Failed to get component insights")

		// Build a map of component name to priority for easier testing
		priorityMap := make(map[string]client.InsightComponentPriority)
		for _, insight := range insights {
			priorityMap[insight.Name] = *insight.Priority
		}

		for name, expectedPriority := range expectedComponentPriorityMap {
			assert.Equal(t, expectedPriority, priorityMap[name], "Priority for %s should be %s", name, expectedPriority)
		}
	})

	t.Run("should handle empty cache without errors", func(t *testing.T) {
		// Initialize a fresh cache for this test
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		// Get component insights from empty cache
		insights, err := storeInstance.GetComponentInsights()
		require.NoError(t, err, "Failed to get component insights from empty cache")

		require.Nil(t, insights, "Expected nil insights from empty cache")
	})

	t.Run("should include failed components managed by plural services with their service id", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		unmanaged := []client.ComponentChildAttributes{
			createComponentAttributes("app-unmanaged-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-unmanaged-1")),
			createComponentAttributes("ingress-unmanaged", nil, WithAttributesKind("Ingress"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("ingress-unmanaged")),
		}
		managed := []client.ComponentChildAttributes{
			createComponentAttributes("app-plural-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-plural-1")),
			createComponentAttributes("ingress-plural", nil, WithAttributesKind("Ingress"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("ingress-plural")),
			// healthy components never show up
			createComponentAttributes("app-plural-running", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("app-plural-running")),
		}

		for _, tc := range unmanaged {
			require.NoError(t, storeInstance.SaveComponentAttributes(tc), "Failed to add unmanaged component to cache")
		}
		// The SaveComponentAttributes signature accepts args for node, created_at, and service_id
		for _, tc := range managed {
			require.NoError(t, storeInstance.SaveComponentAttributes(tc, nil, nil, "plural-service-1"), "Failed to add plural-managed component to cache")
		}

		insights, err := storeInstance.GetComponentInsights()
		require.NoError(t, err, "Failed to get component insights")

		serviceIDs := make(map[string]string, len(insights))
		for _, insight := range insights {
			serviceIDs[insight.Name] = lo.FromPtr(insight.ServiceID)
		}

		require.Equal(t, map[string]string{
			"app-unmanaged-1":   "",
			"ingress-unmanaged": "",
			"app-plural-1":      "plural-service-1",
			"ingress-plural":    "plural-service-1",
		}, serviceIDs, "Managed failures should be reported with the id of the service managing them")
	})

	t.Run("should include all unmanaged failed components in insights", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		// Define test components, all without service_id (unmanaged)
		testComponents := []client.ComponentChildAttributes{
			// Failed root components (different kinds)
			createComponentAttributes("deployment-unmanaged", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("deployment-unmanaged")),
			createComponentAttributes("statefulset-unmanaged", nil, WithAttributesKind("StatefulSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("statefulset-unmanaged")),
			createComponentAttributes("ingress-unmanaged", nil, WithAttributesKind("Ingress"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("ingress-unmanaged")),
			createComponentAttributes("certificate-unmanaged", nil, WithAttributesKind("Certificate"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("certificate-unmanaged")),
			createComponentAttributes("daemonset-unmanaged", nil, WithAttributesKind("DaemonSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("daemonset-unmanaged")),

			// Failed child component with unmanaged parent
			createComponentAttributes("deployment-parent", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStatePending), WithAttributesName("deployment-parent")),
			createComponentAttributes("pod-child", lo.ToPtr("deployment-parent"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("pod-child")),

			// Running unmanaged components (should not appear in insights)
			createComponentAttributes("deployment-running", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("deployment-running")),
		}

		expectedComponentNames := []string{
			"deployment-unmanaged",
			"statefulset-unmanaged",
			"ingress-unmanaged",
			"certificate-unmanaged",
			"daemonset-unmanaged",
			"deployment-parent",
		}

		// Insert all unmanaged test components (no service_id)
		for _, tc := range testComponents {
			err := storeInstance.SaveComponentAttributes(tc)
			require.NoError(t, err, "Failed to add unmanaged component to cache")
		}

		// Get component insights
		insights, err := storeInstance.GetComponentInsights()
		require.NoError(t, err, "Failed to get component insights")

		actualNames := algorithms.Map(
			insights,
			func(i client.ClusterInsightComponentAttributes) string { return i.Name },
		)

		sort.Strings(actualNames)
		sort.Strings(expectedComponentNames)

		require.Equal(t,
			expectedComponentNames,
			actualNames,
			"All unmanaged failed components should be included in insights",
		)
	})

	t.Run("should mix managed and unmanaged components correctly", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		testComponents := []struct {
			component client.ComponentChildAttributes
			serviceID string // empty string means unmanaged
		}{
			// Unmanaged failed components
			{
				component: createComponentAttributes("app-unmanaged-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-unmanaged-1")),
			},
			{
				component: createComponentAttributes("app-unmanaged-2", nil, WithAttributesKind("Ingress"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-unmanaged-2")),
			},

			// Service1-managed failed components
			{
				component: createComponentAttributes("app-service1-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-service1-1")),
				serviceID: "service-1",
			},
			{
				component: createComponentAttributes("app-service1-2", nil, WithAttributesKind("Certificate"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-service1-2")),
				serviceID: "service-1",
			},

			// Service2-managed failed component
			{
				component: createComponentAttributes("app-service2-1", nil, WithAttributesKind("StatefulSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-service2-1")),
				serviceID: "service-2",
			},

			// Service1-managed pending root with a failed pod. The pod has no service id of its own, it is
			// reported through its root (never as a separate row) and inherits the root's service.
			{
				component: createComponentAttributes("app-service1-parent", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-service1-parent")),
				serviceID: "service-1",
			},
			{
				component: createComponentAttributes("app-service1-child", new("app-service1-parent"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-service1-child")),
			},
		}

		for _, tc := range testComponents {
			if tc.serviceID == "" {
				require.NoError(t, storeInstance.SaveComponentAttributes(tc.component), "Failed to add unmanaged component to cache")
			} else {
				require.NoError(t, storeInstance.SaveComponentAttributes(tc.component, nil, nil, tc.serviceID), "Failed to add managed component to cache")
			}
		}

		insights, err := storeInstance.GetComponentInsights()
		require.NoError(t, err, "Failed to get component insights")

		serviceIDs := make(map[string]string, len(insights))
		for _, insight := range insights {
			serviceIDs[insight.Name] = lo.FromPtr(insight.ServiceID)
		}

		require.Equal(t, map[string]string{
			"app-unmanaged-1":     "",
			"app-unmanaged-2":     "",
			"app-service1-1":      "service-1",
			"app-service1-2":      "service-1",
			"app-service2-1":      "service-2",
			"app-service1-parent": "service-1",
		}, serviceIDs, "Managed and unmanaged failures should both be reported, each with its own service id")
	})

	t.Run("should not elevate priority of unrelated components that only fuzzy match critical names", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		// Business workloads whose names contain the letters of a critical keyword in order
		testComponents := []client.ComponentChildAttributes{
			// c-o-r-e...d-n-s -> "coredns"
			createComponentAttributes("core-banking-dns-proxy", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("core-banking-dns-proxy"), WithAttributesNamespace("bank")),
			// con-cert-manager -> "certmanager"
			createComponentAttributes("concert-manager", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("concert-manager"), WithAttributesNamespace("events")),
			// kube-rnetes-proxy -> "kubeproxy"
			createComponentAttributes("kubernetes-proxy-docs", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("kubernetes-proxy-docs"), WithAttributesNamespace("docs")),
		}

		for _, tc := range testComponents {
			err := storeInstance.SaveComponentAttributes(tc)
			require.NoError(t, err, "Failed to add component %s to cache", tc.UID)
		}

		insights, err := storeInstance.GetComponentInsights()
		require.NoError(t, err, "Failed to get component insights")

		priorityMap := make(map[string]client.InsightComponentPriority)
		for _, insight := range insights {
			priorityMap[insight.Name] = *insight.Priority
		}

		for _, tc := range testComponents {
			assert.Equal(t, client.InsightComponentPriorityLow, priorityMap[tc.Name], "Priority for %s should be %s", tc.Name, client.InsightComponentPriorityLow)
		}
	})

	t.Run("should assign high priority to cluster networking components", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		// When any of these is down, pod networking or all ingress traffic is down for the whole cluster.
		// Without replica counts the failure is HIGH, the tests below cover a component that is mostly down.
		testComponents := []client.ComponentChildAttributes{
			// AWS VPC CNI
			createComponentAttributes("aws-node", nil, WithAttributesKind("DaemonSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("aws-node"), WithAttributesNamespace("kube-system")),
			createComponentAttributes("cilium", nil, WithAttributesKind("DaemonSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("cilium"), WithAttributesNamespace("kube-system")),
			createComponentAttributes("calico-node", nil, WithAttributesKind("DaemonSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("calico-node"), WithAttributesNamespace("calico-system")),
			createComponentAttributes("ingress-nginx-controller", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("ingress-nginx-controller"), WithAttributesNamespace("ingress-nginx")),
		}

		for _, tc := range testComponents {
			err := storeInstance.SaveComponentAttributes(tc)
			require.NoError(t, err, "Failed to add component %s to cache", tc.UID)
		}

		insights, err := storeInstance.GetComponentInsights()
		require.NoError(t, err, "Failed to get component insights")

		priorityMap := make(map[string]client.InsightComponentPriority)
		for _, insight := range insights {
			priorityMap[insight.Name] = *insight.Priority
		}

		for _, tc := range testComponents {
			assert.Equal(t, client.InsightComponentPriorityHigh, priorityMap[tc.Name], "Priority for %s should be %s", tc.Name, client.InsightComponentPriorityHigh)
		}
	})

	t.Run("should only make core components critical and only when most of them are down", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		// Running pods without a service are not stored, so every workload has one stored failed pod and only the
		// desired and ready replica counts of the Deployment tell how much of it is down.
		for _, w := range []struct {
			name           string
			desired, ready int64
		}{
			{name: "coredns", desired: 2, ready: 0},                  // core, fully down
			{name: "ingress-nginx-controller", desired: 4, ready: 1}, // core, three quarters down
			{name: "cert-manager-webhook", desired: 2, ready: 1},     // core, half down
			{name: "orders-api", desired: 3, ready: 0},               // app, fully down
			{name: "orders-worker", desired: 3, ready: 2},            // app, partly down
		} {
			saveProgressingDeployment(t, storeInstance, w.name, w.desired, w.ready)
			require.NoError(t, storeInstance.SaveComponentAttributes(createComponentAttributes(w.name+"-rs", new(w.name), WithAttributesKind("ReplicaSet"), WithAttributesState(client.ComponentStatePending), WithAttributesName(w.name+"-rs"))))
			require.NoError(t, storeInstance.SaveComponentAttributes(createComponentAttributes(w.name+"-pod", new(w.name+"-rs"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName(w.name+"-pod"))))
		}

		insights, err := storeInstance.GetComponentInsights()
		require.NoError(t, err, "Failed to get component insights")

		priorityMap := make(map[string]client.InsightComponentPriority)
		for _, insight := range insights {
			priorityMap[insight.Name] = *insight.Priority
		}

		assert.Equal(t, client.InsightComponentPriorityCritical, priorityMap["coredns"])
		assert.Equal(t, client.InsightComponentPriorityCritical, priorityMap["ingress-nginx-controller"])
		assert.Equal(t, client.InsightComponentPriorityHigh, priorityMap["cert-manager-webhook"])
		assert.Equal(t, client.InsightComponentPriorityMedium, priorityMap["orders-api"], "an app is at most MEDIUM, even fully down")
		assert.Equal(t, client.InsightComponentPriorityLow, priorityMap["orders-worker"])
	})

	t.Run("should rank a full outage above a partial degradation of the same workload", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		// Running pods without a service are not stored, so both workloads have exactly one stored failed pod.
		// Only the desired and ready replica counts of the Deployment tell a full outage from a partial one.
		saveProgressingDeployment(t, storeInstance, "api-down", 3, 0)
		saveProgressingDeployment(t, storeInstance, "api-degraded", 3, 2)
		for _, name := range []string{"api-down", "api-degraded"} {
			require.NoError(t, storeInstance.SaveComponentAttributes(createComponentAttributes(name+"-rs", new(name), WithAttributesKind("ReplicaSet"), WithAttributesState(client.ComponentStatePending), WithAttributesName(name+"-rs"))))
			require.NoError(t, storeInstance.SaveComponentAttributes(createComponentAttributes(name+"-pod", new(name+"-rs"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName(name+"-pod"))))
		}

		insights, err := storeInstance.GetComponentInsights()
		require.NoError(t, err, "Failed to get component insights")

		priorityMap := make(map[string]client.InsightComponentPriority)
		for _, insight := range insights {
			priorityMap[insight.Name] = *insight.Priority
		}

		require.Contains(t, priorityMap, "api-down")
		require.Contains(t, priorityMap, "api-degraded")
		assert.Greater(t, priorityRank(priorityMap["api-down"]), priorityRank(priorityMap["api-degraded"]),
			"Full outage priority (%s) should be higher than partial degradation priority (%s)", priorityMap["api-down"], priorityMap["api-degraded"])
	})
}

// saveProgressingDeployment stores a Deployment that is rolling out with the given desired and ready replicas,
// the state a crashlooping Deployment is in before its progress deadline passes.
func saveProgressingDeployment(t *testing.T, storeInstance store.Store, name string, desired, ready int64) {
	t.Helper()
	deployment := unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "apps/v1",
		"kind":       "Deployment",
		"metadata":   map[string]any{"name": name, "namespace": testNamespace, "uid": name, "generation": int64(1)},
		"spec":       map[string]any{"replicas": desired},
		"status": map[string]any{
			"observedGeneration": int64(1),
			"replicas":           desired,
			"updatedReplicas":    desired,
			"readyReplicas":      ready,
			"availableReplicas":  ready,
		},
	}}
	require.NoError(t, storeInstance.SaveComponent(deployment), "Failed to add deployment %s to cache", name)
}

// saveFailingDeployment stores a Deployment that exceeded its progress deadline with the given desired and ready
// replicas, so it is a failing root by itself.
func saveFailingDeployment(t *testing.T, storeInstance store.Store, namespace, name string, desired, ready int64) {
	t.Helper()
	deployment := unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "apps/v1",
		"kind":       "Deployment",
		"metadata":   map[string]any{"name": name, "namespace": namespace, "uid": namespace + "/" + name, "generation": int64(1)},
		"spec":       map[string]any{"replicas": desired},
		"status": map[string]any{
			"observedGeneration": int64(1),
			"replicas":           desired,
			"readyReplicas":      ready,
			"conditions": []any{map[string]any{
				"type": "Progressing", "status": "False", "reason": "ProgressDeadlineExceeded",
				"lastTransitionTime": time.Now().UTC().Format(time.RFC3339),
			}},
		},
	}}
	require.NoError(t, storeInstance.SaveComponent(deployment), "Failed to add deployment %s/%s to cache", namespace, name)
}

func priorityRank(priority client.InsightComponentPriority) int {
	return lo.IndexOf(client.AllInsightComponentPriority, priority)
}

func saveHealthyComponents(t *testing.T, storeInstance store.Store, count int) {
	for i := range count {
		name := fmt.Sprintf("healthy-%d", i)
		err := storeInstance.SaveComponentAttributes(createComponentAttributes(name, nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateRunning), WithAttributesName(name)))
		require.NoError(t, err, "Failed to add component %s to cache", name)
	}
}

func TestClusterHealthScore(t *testing.T) {
	t.Run("should not scale deductions with the number of pods of a failing workload", func(t *testing.T) {
		scoreWithFailedPods := func(pods int) int64 {
			storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
			assert.NoError(t, err)
			defer func() {
				if err := storeInstance.Shutdown(); err != nil {
					t.Fatalf("Failed to close component cache: %v", err)
				}
			}()

			saveHealthyComponents(t, storeInstance, 100)

			// One failing DaemonSet with a failed pod on each node
			err = storeInstance.SaveComponentAttributes(createComponentAttributes("ebs-csi-node", nil, WithAttributesKind("DaemonSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("ebs-csi-node"), WithAttributesNamespace("kube-system")))
			require.NoError(t, err)
			for i := range pods {
				name := fmt.Sprintf("ebs-csi-node-%d", i)
				err := storeInstance.SaveComponentAttributes(createComponentAttributes(name, new("ebs-csi-node"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName(name), WithAttributesNamespace("kube-system")))
				require.NoError(t, err)
			}

			score, err := storeInstance.GetHealthScore()
			require.NoError(t, err)
			return score
		}

		threeNodes := scoreWithFailedPods(3)
		tenNodes := scoreWithFailedPods(10)

		assert.Positive(t, tenNodes, "A single failing DaemonSet should not zero the cluster health score")
		assert.Equal(t, threeNodes, tenNodes, "The same failure should score the same on a 3-node and a 10-node cluster")
	})

	t.Run("should apply the critical deduction when a core component is mostly down", func(t *testing.T) {
		// The critical deduction is 50 points, so with an otherwise healthy cluster the score must not exceed 50.
		cases := []struct {
			name      string
			namespace string
		}{
			{name: "coredns", namespace: "kube-system"},
			{name: "coredns", namespace: "dns"},
			{name: "istiod", namespace: "istio-system"},
		}

		for _, tc := range cases {
			t.Run(fmt.Sprintf("%s/%s", tc.namespace, tc.name), func(t *testing.T) {
				storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
				assert.NoError(t, err)
				defer func() {
					if err := storeInstance.Shutdown(); err != nil {
						t.Fatalf("Failed to close component cache: %v", err)
					}
				}()

				saveHealthyComponents(t, storeInstance, 100)
				saveFailingDeployment(t, storeInstance, tc.namespace, tc.name, 2, 0)

				score, err := storeInstance.GetHealthScore()
				require.NoError(t, err)
				assert.Equal(t, int64(50), score, "%s in %s is fully down and should take the critical deduction", tc.name, tc.namespace)
			})
		}
	})

	t.Run("should apply the high deduction when a core component is partly down", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		saveHealthyComponents(t, storeInstance, 100)
		saveFailingDeployment(t, storeInstance, "kube-system", "coredns", 2, 1)

		score, err := storeInstance.GetHealthScore()
		require.NoError(t, err)
		assert.Equal(t, int64(75), score, "one of two coredns replicas down is HIGH, 25 points")
	})

	t.Run("should not take the score below 60 for third party failures", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		saveHealthyComponents(t, storeInstance, 100)
		for i := range 15 {
			saveFailingDeployment(t, storeInstance, "shop", fmt.Sprintf("app-%d", i), 3, 0)
		}

		score, err := storeInstance.GetHealthScore()
		require.NoError(t, err)
		assert.Equal(t, int64(70), score, "total outages of apps are MEDIUM, capped at 30 points")
	})
}
