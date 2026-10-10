package proxy

import "testing"

func TestBuildPrometheusIngestTarget(t *testing.T) {
	target, err := BuildPrometheusIngestTarget("http://vm:8428/select/tenant-a/prometheus")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if got, want := target.String(), "http://vm:8428/insert/tenant-a/prometheus/api/v1/write"; got != want {
		t.Fatalf("unexpected target: got %s want %s", got, want)
	}
}

func TestBuildPrometheusIngestTargetTelemetry(t *testing.T) {
	target, err := BuildPrometheusIngestTarget("https://telemetry.example.com/metrics/read/ns/tenant-a")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if got, want := target.String(), "https://telemetry.example.com/metrics/write/ns/tenant-a/api/v1/write"; got != want {
		t.Fatalf("unexpected target: got %s want %s", got, want)
	}
}

func TestBuildPrometheusIngestTargetInvalid(t *testing.T) {
	_, err := BuildPrometheusIngestTarget("http://vm:8428/api/v1")
	if err == nil {
		t.Fatalf("expected error")
	}
}

func TestBuildPrometheusQueryTarget(t *testing.T) {
	target, err := BuildPrometheusQueryTarget("http://vm:8428/select/tenant-a/prometheus", "/ext/v1/query/prometheus/api/v1/query")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if got, want := target.String(), "http://vm:8428/select/tenant-a/prometheus/api/v1/query"; got != want {
		t.Fatalf("unexpected target: got %s want %s", got, want)
	}
}

func TestBuildLokiPushTarget(t *testing.T) {
	target, err := BuildLokiPushTarget("http://logs:3100/logs/write/ns/tenant-a")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if got, want := target.String(), "http://logs:3100/logs/write/ns/tenant-a/loki/api/v1/push"; got != want {
		t.Fatalf("unexpected target: got %s want %s", got, want)
	}
}

func TestBuildLokiElasticTarget(t *testing.T) {
	target, err := BuildLokiElasticTarget("http://logs:3100/logs/write/ns/tenant-a", "/_bulk")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if got, want := target.String(), "http://logs:3100/logs/write/ns/tenant-a/elasticsearch/_bulk"; got != want {
		t.Fatalf("unexpected target: got %s want %s", got, want)
	}
}
