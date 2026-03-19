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
