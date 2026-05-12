package kasapp

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// Test for https://gitlab.com/gitlab-org/cluster-integration/gitlab-agent/-/issues/374.
// Test for https://github.com/open-telemetry/opentelemetry-go/issues/3769.
// If it fails, make sure you've updated the version of go.opentelemetry.io/otel/semconv that's imported to match
// what OTEL SDK uses internally.
func TestConstructResource(t *testing.T) {
	_, err := constructOTELResource()
	require.NoError(t, err)
}
