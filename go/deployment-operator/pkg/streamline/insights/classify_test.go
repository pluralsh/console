package insights_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/insights"
)

func TestClassify(t *testing.T) {
	tests := []struct {
		name          string
		kind          string
		namespace     string
		workload      string
		priorityClass string
		want          int
	}{
		{name: "coredns", kind: "Deployment", workload: "coredns", want: insights.ScoreCritical},
		{name: "core-dns", kind: "Deployment", workload: "core-dns", want: insights.ScoreCritical},
		{name: "kube-dns alias", kind: "Deployment", workload: "kube-dns", want: insights.ScoreCritical},
		{name: "aws-node", kind: "DaemonSet", namespace: "kube-system", workload: "aws-node", want: insights.ScoreCritical},
		{name: "amazon-vpc-cni alias", kind: "DaemonSet", workload: "amazon-vpc-cni", want: insights.ScoreCritical},
		{name: "ebs-csi-node", kind: "DaemonSet", workload: "ebs-csi-node", want: insights.ScoreCritical},
		{name: "gce-pd-csi-controller", kind: "Deployment", workload: "gce-pd-csi-controller-sa", want: insights.ScoreCritical},
		{name: "cert-manager-webhook", kind: "Deployment", workload: "cert-manager-webhook", want: insights.ScoreCritical},
		{name: "ingress-nginx-controller", kind: "Deployment", workload: "ingress-nginx-controller", want: insights.ScoreCritical},
		{name: "rke2 ingress alias keeps working through runs", kind: "DaemonSet", workload: "rke2-ingress-nginx-controller", want: insights.ScoreCritical},
		{name: "metrics-server", kind: "Deployment", workload: "metrics-server", want: insights.ScoreHigh},

		// letters in the right order are not a match
		{name: "concert-manager", kind: "Deployment", namespace: "events", workload: "concert-manager", want: insights.ScoreLow},
		{name: "core-banking-dns-proxy", kind: "Deployment", namespace: "bank", workload: "core-banking-dns-proxy", want: insights.ScoreLow},
		{name: "kubernetes-proxy-docs", kind: "Deployment", namespace: "docs", workload: "kubernetes-proxy-docs", want: insights.ScoreLow},
		{name: "node-metrics-exporter", kind: "Deployment", workload: "node-metrics-exporter", want: insights.ScoreLow},

		// priority class wins over everything
		{name: "system priority class", kind: "Deployment", workload: "payments", priorityClass: "system-cluster-critical", want: insights.ScoreCritical},
		{name: "custom priority class is ignored", kind: "Deployment", workload: "payments", priorityClass: "high", want: insights.ScoreLow},

		// namespace tier beats kind default, but not the catalog
		{name: "kube-system workload", kind: "Deployment", namespace: "kube-system", workload: "foo", want: insights.ScoreHigh},
		{name: "istio-system workload", kind: "Deployment", namespace: "istio-system", workload: "foo", want: insights.ScoreCritical},

		// kind defaults
		{name: "statefulset", kind: "StatefulSet", workload: "db", want: insights.ScoreHigh},
		{name: "daemonset", kind: "DaemonSet", workload: "agent", want: insights.ScoreMedium},
		{name: "deployment", kind: "Deployment", workload: "api", want: insights.ScoreLow},
		{name: "ingress", kind: "Ingress", workload: "web", want: insights.ScoreCritical},
		{name: "certificate", kind: "Certificate", workload: "web-tls", want: insights.ScoreCritical},
		{name: "non-workload named like a catalog entry is not special", kind: "ConfigMap", workload: "coredns", want: insights.ScoreLow},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := insights.Classify(tt.kind, tt.namespace, tt.workload, tt.priorityClass)
			assert.Equal(t, tt.want, got.Score, got.Reason)
			assert.NotEmpty(t, got.Reason)
		})
	}
}

func TestExtract(t *testing.T) {
	now := time.Date(2026, 10, 9, 12, 0, 0, 0, time.UTC)

	deployment := func(spec, status, annotations map[string]any) *unstructured.Unstructured {
		meta := map[string]any{"name": "api", "namespace": "apps"}
		if annotations != nil {
			meta["annotations"] = annotations
		}
		return &unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "apps/v1", "kind": "Deployment", "metadata": meta, "spec": spec, "status": status,
		}}
	}

	t.Run("reads replicas, priority class and annotation of a failing root", func(t *testing.T) {
		obj := deployment(
			map[string]any{"replicas": int64(3), "template": map[string]any{"spec": map[string]any{"priorityClassName": "system-node-critical"}}},
			map[string]any{"readyReplicas": int64(1)},
			map[string]any{insights.AnnotationPriority: " high "},
		)

		facts := insights.Extract(obj, false, true, "exceeded progress deadline", now)

		assert.Equal(t, int64(3), *facts.DesiredReplicas)
		assert.Equal(t, int64(1), *facts.ReadyReplicas)
		assert.Equal(t, "system-node-critical", facts.PriorityClass)
		assert.Equal(t, "HIGH", facts.PriorityAnnotation)
		assert.Equal(t, insights.ScoreCritical, facts.Criticality)
		assert.Equal(t, "exceeded progress deadline", facts.HealthMessage)
		assert.Equal(t, now.Unix(), facts.FailingSince)
	})

	t.Run("defaults desired replicas to one and ready to zero", func(t *testing.T) {
		facts := insights.Extract(deployment(map[string]any{}, map[string]any{}, nil), false, true, "", now)

		assert.Equal(t, int64(1), *facts.DesiredReplicas)
		assert.Equal(t, int64(0), *facts.ReadyReplicas)
	})

	t.Run("daemon set replicas come from the status", func(t *testing.T) {
		obj := &unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "apps/v1", "kind": "DaemonSet", "metadata": map[string]any{"name": "agent"},
			"status": map[string]any{"desiredNumberScheduled": int64(10), "numberReady": int64(4)},
		}}

		facts := insights.Extract(obj, false, true, "", now)

		assert.Equal(t, int64(10), *facts.DesiredReplicas)
		assert.Equal(t, int64(4), *facts.ReadyReplicas)
	})

	t.Run("failing time comes from the earliest failing condition", func(t *testing.T) {
		since := now.Add(-3 * time.Hour)
		obj := deployment(map[string]any{}, map[string]any{"conditions": []any{
			map[string]any{"type": "Available", "status": "False", "lastTransitionTime": since.Format(time.RFC3339)},
			map[string]any{"type": "Progressing", "status": "False", "lastTransitionTime": since.Add(time.Hour).Format(time.RFC3339)},
			map[string]any{"type": "Ready", "status": "True", "lastTransitionTime": since.Add(-time.Hour).Format(time.RFC3339)},
		}}, nil)

		facts := insights.Extract(obj, false, true, "", now)

		assert.Equal(t, since.Unix(), facts.FailingSince)
	})

	t.Run("unknown annotation values are dropped", func(t *testing.T) {
		obj := deployment(map[string]any{}, map[string]any{}, map[string]any{insights.AnnotationPriority: "urgent"})

		assert.Empty(t, insights.Extract(obj, false, true, "", now).PriorityAnnotation)
	})

	t.Run("running root kinds are classified, other running objects are not", func(t *testing.T) {
		assert.NotZero(t, insights.Extract(deployment(map[string]any{}, map[string]any{}, nil), true, false, "", now).Criticality)

		pod := &unstructured.Unstructured{Object: map[string]any{"apiVersion": "v1", "kind": "Pod", "metadata": map[string]any{"name": "p"}}}
		facts := insights.Extract(pod, true, false, "", now)
		assert.Zero(t, facts.Criticality)
		assert.Zero(t, facts.FailingSince)
	})

	t.Run("failing non-root objects are classified", func(t *testing.T) {
		node := &unstructured.Unstructured{Object: map[string]any{"apiVersion": "v1", "kind": "Node", "metadata": map[string]any{"name": "n1"}}}

		assert.Equal(t, insights.ScoreHigh, insights.Extract(node, false, true, "", now).Criticality)
	})
}
