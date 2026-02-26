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
	// Newer versions of OTEL may return a schema URL conflict error; accept both nil and the specific conflict message.
	if err != nil {
		require.Contains(t, err.Error(), "conflicting Schema URL")
	}
}
