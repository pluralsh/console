package store_test

import (
	"context"
	"sort"
	"testing"

	"github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/pluralsh/deployment-operator/pkg/streamline/api"
	"github.com/samber/lo"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/deployment-operator/pkg/streamline/store"
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
			createComponentAttributes("app-cronjob-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-cronjob-1")),

			// Pending component
			createComponentAttributes("app-migration-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-migration-1")),

			// Ingress (failed) -> Certificate (failed)
			createComponentAttributes("app-ingress-1", nil, WithAttributesKind("Ingress"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-ingress-1")),
			createComponentAttributes("app-certificate-1", lo.ToPtr("app-ingress-1"), WithAttributesKind("Certificate"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-certificate-1")),

			// Ingress (pending) -> Certificate (failed)
			createComponentAttributes("app-ingress-2", nil, WithAttributesKind("Ingress"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-ingress-2")),
			createComponentAttributes("app-certificate-2", lo.ToPtr("app-ingress-2"), WithAttributesKind("Certificate"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-certificate-2")),

			// StatefulSet (failed)
			createComponentAttributes("app-statefulset-1", nil, WithAttributesKind("StatefulSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-statefulset-1")),

			// DaemonSet (failed)
			createComponentAttributes("app-daemonset-1", nil, WithAttributesKind("DaemonSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-daemonset-1")),

			// Deployment (pending) -> Pod (failed)
			createComponentAttributes("app-deployment-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-deployment-1")),
			createComponentAttributes("app-pod-1", lo.ToPtr("app-deployment-1"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-pod-1")),

			// CRD (pending) -> Deployment (pending) -> Pod (failed)
			createComponentAttributes("app-crd-1", nil, WithAttributesKind("CustomResourceDefinition"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-crd-1")),
			createComponentAttributes("app-deployment-2", lo.ToPtr("app-crd-1"), WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-deployment-2")),
			createComponentAttributes("app-pod-2", lo.ToPtr("app-deployment-2"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-pod-2")),

			// CRD (failed) -> Deployment (failed) -> Pod (failed)
			createComponentAttributes("app-crd-2", nil, WithAttributesKind("CustomResourceDefinition"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-crd-2")),
			createComponentAttributes("app-deployment-3", lo.ToPtr("app-crd-2"), WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-deployment-3")),
			createComponentAttributes("app-pod-3", lo.ToPtr("app-deployment-3"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-pod-3")),

			// CRD (failed) -> Deployment (failed) -> ReplicaSet (failed) -> Pod (failed)
			createComponentAttributes("app-crd-3", nil, WithAttributesKind("CustomResourceDefinition"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-crd-3")),
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
			"app-cronjob-1",
			"app-ingress-1",
			"app-certificate-1",
			"app-ingress-2",
			"app-certificate-2",
			"app-statefulset-1",
			"app-daemonset-1",
			"app-deployment-1",
			"app-deployment-2",
			"app-deployment-3",
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
			// Critical priority resources
			createComponentAttributes("ingress-1", nil, WithAttributesKind("Ingress"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("ingress-1")),
			createComponentAttributes("certificate-1", nil, WithAttributesKind("Certificate"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("certificate-1")),
			createComponentAttributes("cert-manager-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("cert-manager-webhook"), WithAttributesNamespace("cert-manager")),
			createComponentAttributes("coredns-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("coredns")),

			// High priority resources
			createComponentAttributes("statefulset-1", nil, WithAttributesKind("StatefulSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("statefulset-1")),
			createComponentAttributes("node-exporter", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("node-exporter")),

			// Medium priority resources
			createComponentAttributes("daemonset-1", nil, WithAttributesKind("DaemonSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("daemonset-1")),

			// Low priority resources (default)
			createComponentAttributes("deployment-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("deployment-1")),
		}

		expectedComponentPriorityMap := map[string]client.InsightComponentPriority{
			"ingress-1":            client.InsightComponentPriorityCritical,
			"certificate-1":        client.InsightComponentPriorityCritical,
			"cert-manager-webhook": client.InsightComponentPriorityCritical,
			"coredns":              client.InsightComponentPriorityCritical,
			"statefulset-1":        client.InsightComponentPriorityHigh,
			"node-exporter":        client.InsightComponentPriorityHigh,
			"daemonset-1":          client.InsightComponentPriorityMedium,
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

	t.Run("should assign priorities based on string similarity in resource names and namespaces", func(t *testing.T) {
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
			createComponentAttributes("app-in-kube-proxy", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-in-sensitive-ns-2"), WithAttributesNamespace("kube-proxy")),

			// Components with partial name matches to high priority resources
			createComponentAttributes("node-exporter-similar", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("node-metrics-exporter"), WithAttributesNamespace("monitoring")),

			// Components with no special priority that could be slightly similar to other resources
			createComponentAttributes("app-similar-to-istio", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("iso-ist-app"), WithAttributesNamespace("default")),
			createComponentAttributes("app-similar-to-cert-manager", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("custom-cert-provisioner"), WithAttributesNamespace("default")),
		}

		expectedComponentPriorityMap := map[string]client.InsightComponentPriority{
			"cert-manager":             client.InsightComponentPriorityCritical,
			"core-dns":                 client.InsightComponentPriorityCritical,
			"istio-ingressgateway":     client.InsightComponentPriorityCritical,
			"linkerd-proxy":            client.InsightComponentPriorityCritical,
			"ebs-csi-node":             client.InsightComponentPriorityCritical,
			"gce-pd-csi-controller-sa": client.InsightComponentPriorityCritical,
			"app-in-sensitive-ns-1":    client.InsightComponentPriorityCritical,
			"app-in-sensitive-ns-2":    client.InsightComponentPriorityCritical,
			"node-metrics-exporter":    client.InsightComponentPriorityHigh,
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

		require.Nil(t, insights, "Expected non-nil insights object from empty cache")
	})

	t.Run("should exclude failed components managed by plural services", func(t *testing.T) {
		storeInstance, err := store.NewDatabaseStore(context.Background(), store.WithStorage(api.StorageFile))
		assert.NoError(t, err)
		defer func() {
			if err := storeInstance.Shutdown(); err != nil {
				t.Fatalf("Failed to close component cache: %v", err)
			}
		}()

		// Define test components where some are managed by plural services
		testComponents := []client.ComponentChildAttributes{
			// Failed deployment NOT managed by a plural service (should be included)
			createComponentAttributes("app-unmanaged-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-unmanaged-1")),

			// Failed deployment managed by plural service with service_id (should be excluded)
			createComponentAttributes("app-plural-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-plural-1")),

			// Failed ingress NOT managed by plural service (should be included)
			createComponentAttributes("ingress-unmanaged", nil, WithAttributesKind("Ingress"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("ingress-unmanaged")),

			// Failed ingress managed by plural service (should be excluded)
			createComponentAttributes("ingress-plural", nil, WithAttributesKind("Ingress"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("ingress-plural")),

			// Running component managed by plural service (should not be in insights anyway)
			createComponentAttributes("app-plural-running", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateRunning), WithAttributesName("app-plural-running")),
		}

		expectedComponentNames := []string{
			"app-unmanaged-1",
			"ingress-unmanaged",
		}

		// Insert test components without service_id (unmanaged)
		for _, tc := range []client.ComponentChildAttributes{testComponents[0], testComponents[2]} {
			err := storeInstance.SaveComponentAttributes(tc)
			require.NoError(t, err, "Failed to add unmanaged component to cache")
		}

		// Insert test components with service_id (managed by plural service)
		// The SaveComponentAttributes signature accepts args for node, created_at, and service_id
		for _, tc := range []client.ComponentChildAttributes{testComponents[1], testComponents[3], testComponents[4]} {
			err := storeInstance.SaveComponentAttributes(tc, nil, nil, "plural-service-1")
			require.NoError(t, err, "Failed to add plural-managed component to cache")
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
			"Components managed by plural services should be excluded from insights",
		)
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

		// Define test components with mixed service management
		testComponents := []struct {
			component client.ComponentChildAttributes
			serviceID string // empty string means unmanaged
		}{
			// Unmanaged failed components
			{
				component: createComponentAttributes("app-unmanaged-1", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-unmanaged-1")),
				serviceID: "",
			},
			{
				component: createComponentAttributes("app-unmanaged-2", nil, WithAttributesKind("Ingress"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-unmanaged-2")),
				serviceID: "",
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

			// Service2-managed failed components
			{
				component: createComponentAttributes("app-service2-1", nil, WithAttributesKind("StatefulSet"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-service2-1")),
				serviceID: "service-2",
			},

			// Service1-managed pending component with unmanaged failed child (that will be skipped because it is a Pod)
			{
				component: createComponentAttributes("app-service1-parent", nil, WithAttributesKind("Deployment"), WithAttributesState(client.ComponentStatePending), WithAttributesName("app-service1-parent")),
				serviceID: "service-1",
			},
			{
				component: createComponentAttributes("app-service1-child", lo.ToPtr("app-service1-parent"), WithAttributesKind("Pod"), WithAttributesState(client.ComponentStateFailed), WithAttributesName("app-service1-child")),
				serviceID: "",
			},
		}

		expectedComponentNames := []string{
			"app-unmanaged-1",
			"app-unmanaged-2",
		}

		// Insert all test components with their respective service_id
		for _, tc := range testComponents {
			if tc.serviceID == "" {
				err := storeInstance.SaveComponentAttributes(tc.component)
				require.NoError(t, err, "Failed to add unmanaged component to cache")
			} else {
				err := storeInstance.SaveComponentAttributes(tc.component, nil, nil, tc.serviceID)
				require.NoError(t, err, "Failed to add managed component to cache")
			}
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
			"Only unmanaged components should appear in insights when mixed with managed ones",
		)
	})
}
