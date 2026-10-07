package client

import (
	"context"
	"encoding/json"
	"reflect"
	"testing"

	"github.com/gqlgo/gqlgenc/clientv2"
)

// encodeVariables encodes the input the same way generated client methods encode request variables.
func encodeVariables(t *testing.T, attributes any) map[string]any {
	t.Helper()

	encoded, err := clientv2.MarshalJSON(context.Background(), map[string]any{"attributes": attributes})
	if err != nil {
		t.Fatalf("failed to encode variables: %v", err)
	}

	var variables map[string]any
	if err := json.Unmarshal(encoded, &variables); err != nil {
		t.Fatalf("failed to decode variables %s: %v", encoded, err)
	}

	attrs, ok := variables["attributes"].(map[string]any)
	if !ok {
		t.Fatalf("attributes are not an object: %s", encoded)
	}
	return attrs
}

func expectField(t *testing.T, object map[string]any, key string, expected any) {
	t.Helper()

	value, ok := object[key]
	if !ok {
		t.Fatalf("expected field %q to be sent, got %v", key, object)
	}
	if !reflect.DeepEqual(value, expected) {
		t.Fatalf("expected field %q to be %#v, got %#v", key, expected, value)
	}
}

func expectObject(t *testing.T, object map[string]any, key string) map[string]any {
	t.Helper()

	value, ok := object[key].(map[string]any)
	if !ok {
		t.Fatalf("expected field %q to be an object, got %#v", key, object[key])
	}
	return value
}

func TestMonitorAttributesSendAllFields(t *testing.T) {
	step := "1m"
	attrs := encodeVariables(t, MonitorAttributes{
		ServiceID:      "service-id",
		Name:           "monitor",
		Severity:       AlertSeverityHigh,
		Type:           MonitorTypeMetrics,
		EvaluationCron: "*/5 * * * *",
		Query: MonitorQueryAttributes{
			Metrics: &MonitorMetricsQueryAttributes{Query: "up", Step: &step},
		},
		Threshold: MonitorThresholdAttributes{Aggregate: MonitorAggregateMax, Value: 0.5},
	})

	expectField(t, attrs, "serviceId", "service-id")
	expectField(t, attrs, "severity", "HIGH")
	expectField(t, attrs, "type", "METRICS")
	for _, key := range []string{"workbenchId", "prompt", "modes", "description", "alertTemplate"} {
		expectField(t, attrs, key, nil)
	}

	threshold := expectObject(t, attrs, "threshold")
	expectField(t, threshold, "aggregate", "MAX")
	expectField(t, threshold, "value", 0.5)

	query := expectObject(t, attrs, "query")
	expectField(t, query, "log", nil)

	metrics := expectObject(t, query, "metrics")
	expectField(t, metrics, "query", "up")
	expectField(t, metrics, "step", "1m")
	for _, key := range []string{"tool", "duration", "options"} {
		expectField(t, metrics, key, nil)
	}
}

func TestMonitorAttributesSendEmptyLists(t *testing.T) {
	attrs := encodeVariables(t, MonitorAttributes{
		Type: MonitorTypeLog,
		Query: MonitorQueryAttributes{
			Log: &MonitorLogQueryAttributes{Query: "error", BucketSize: "5m"},
		},
		Modes: &WorkbenchJobModesAttributes{
			Kubernetes: &WorkbenchJobKubernetesModesAttributes{},
		},
	})

	log := expectObject(t, expectObject(t, attrs, "query"), "log")
	expectField(t, log, "facets", []any{})
	expectField(t, log, "options", nil)
	expectField(t, expectObject(t, attrs, "query"), "metrics", nil)

	modes := expectObject(t, attrs, "modes")
	for _, key := range []string{"plan", "verification", "model", "coding", "budget"} {
		expectField(t, modes, key, nil)
	}
	kubernetes := expectObject(t, modes, "kubernetes")
	expectField(t, kubernetes, "excludeNamespaces", []any{})
	expectField(t, kubernetes, "requireNamespaces", []any{})
	expectField(t, kubernetes, "update", nil)
}

func TestDashboardAttributesSendAllFields(t *testing.T) {
	workbenchID := "workbench-id"
	name := "dashboard"

	attrs := encodeVariables(t, DashboardAttributes{WorkbenchID: &workbenchID, Name: &name})
	expectField(t, attrs, "workbenchId", workbenchID)
	expectField(t, attrs, "name", name)
	expectField(t, attrs, "description", nil)
	expectField(t, attrs, "graphs", []any{})
	expectField(t, attrs, "inputs", []any{})

	options := `{"collapsed":true}`
	attrs = encodeVariables(t, DashboardAttributes{
		Graphs: []*DashboardGraphAttributes{{
			Identifier: "overview",
			Type:       DashboardGraphTypeSection,
			Options:    &options,
			Layout:     DashboardGraphLayoutAttributes{X: 0, Y: 1, W: 12, H: 2},
		}},
		Inputs: []*DashboardInputAttributes{{Name: "namespace", Type: DashboardInputTypeText}},
	})

	graphs, ok := attrs["graphs"].([]any)
	if !ok || len(graphs) != 1 {
		t.Fatalf("expected one graph, got %#v", attrs["graphs"])
	}
	graph := graphs[0].(map[string]any)
	expectField(t, graph, "identifier", "overview")
	expectField(t, graph, "type", "SECTION")
	expectField(t, graph, "options", options)
	expectField(t, graph, "layout", map[string]any{"x": 0.0, "y": 1.0, "w": 12.0, "h": 2.0})
	for _, key := range []string{"title", "description", "sectionId", "markdown", "datasource"} {
		expectField(t, graph, key, nil)
	}

	inputs, ok := attrs["inputs"].([]any)
	if !ok || len(inputs) != 1 {
		t.Fatalf("expected one input, got %#v", attrs["inputs"])
	}
	input := inputs[0].(map[string]any)
	expectField(t, input, "options", []any{})
	expectField(t, input, "datasource", nil)
}

func TestOtherInputsStillOmitEmptyFields(t *testing.T) {
	// Only monitor and dashboard attributes send the full state, other inputs keep the generated behavior.
	attrs := encodeVariables(t, WorkbenchJobModesAttributes{})
	if len(attrs) != 0 {
		t.Fatalf("expected empty fields to be omitted, got %v", attrs)
	}
}
