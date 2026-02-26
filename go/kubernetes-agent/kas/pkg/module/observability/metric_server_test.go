package observability_test

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"

	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/module/observability"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modserver"
)

func TestMetricServer(t *testing.T) {
	ctrl := gomock.NewController(t)
	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(t, err)
	defer listener.Close()
	logger := zaptest.NewLogger(t)
	mockApi := mock_modserver.NewMockApi(ctrl)
	probeRegistry := observability.NewProbeRegistry()
	metricSrv := observability.MetricServer{
		Api:                   mockApi,
		Log:                   logger,
		Name:                  "test-server",
		Listener:              listener,
		PrometheusUrlPath:     "/metrics",
		LivenessProbeUrlPath:  "/liveness",
		ReadinessProbeUrlPath: "/readiness",
		Gatherer:              prometheus.DefaultGatherer,
		Registerer:            prometheus.DefaultRegisterer,
		ProbeRegistry:         probeRegistry,
	}
	handler := metricSrv.ConstructHandler()

	httpGet := func(t *testing.T, path string) *httptest.ResponseRecorder {
		request, err := http.NewRequest("GET", path, nil) // nolint:noctx
		require.NoError(t, err)
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, request)
		return recorder
	}

	// tests

	t.Run("/metrics", func(t *testing.T) {
		httpResponse := httpGet(t, "/metrics").Result()
		require.Equal(t, http.StatusOK, httpResponse.StatusCode)
		httpResponse.Body.Close()
	})

	t.Run("/liveness", func(t *testing.T) {
		// succeeds when there are no probes
		rec := httpGet(t, "/liveness")
		httpResponse := rec.Result()
		require.Equal(t, http.StatusOK, httpResponse.StatusCode)
		require.Empty(t, rec.Body)
		httpResponse.Body.Close()

		// fails when a probe fails
		probeErr := fmt.Errorf("failed liveness on purpose")
		expectedErr := fmt.Errorf("test-liveness: %w", probeErr)
		probeRegistry.RegisterLivenessProbe("test-liveness", func(ctx context.Context) error {
			return probeErr
		})
		mockApi.EXPECT().
			HandleProcessingError(gomock.Any(), gomock.Any(), modshared.NoAgentId, "LivenessProbe failed", expectedErr)
		rec = httpGet(t, "/liveness")
		httpResponse = rec.Result()
		require.Equal(t, http.StatusInternalServerError, httpResponse.StatusCode)
		require.Equal(t, "test-liveness: failed liveness on purpose\n", rec.Body.String())
		httpResponse.Body.Close()
	})

	t.Run("/readiness", func(t *testing.T) {
		markReady := probeRegistry.RegisterReadinessToggle("test-readiness-toggle")

		// fails when toggle has not been called
		expectedErr := fmt.Errorf("test-readiness-toggle: %w", fmt.Errorf("not ready yet"))
		mockApi.EXPECT().HandleProcessingError(gomock.Any(), gomock.Any(), modshared.NoAgentId, "ReadinessProbe failed", expectedErr)
		rec := httpGet(t, "/readiness")
		httpResponse := rec.Result()
		require.Equal(t, http.StatusInternalServerError, httpResponse.StatusCode)
		require.Equal(t, "test-readiness-toggle: not ready yet\n", rec.Body.String())
		httpResponse.Body.Close()

		// succeeds when toggle has been called
		markReady()
		rec = httpGet(t, "/readiness")
		httpResponse = rec.Result()
		require.Equal(t, http.StatusOK, httpResponse.StatusCode)
		require.Empty(t, rec.Body)
		httpResponse.Body.Close()

		// fails when a probe fails
		probeErr := fmt.Errorf("failed readiness on purpose")
		expectedErr = fmt.Errorf("test-readiness: %w", probeErr)
		probeRegistry.RegisterReadinessProbe("test-readiness", func(ctx context.Context) error {
			return probeErr
		})
		mockApi.EXPECT().
			HandleProcessingError(gomock.Any(), gomock.Any(), modshared.NoAgentId, "ReadinessProbe failed", expectedErr)

		rec = httpGet(t, "/readiness")
		httpResponse = rec.Result()
		require.Equal(t, http.StatusInternalServerError, httpResponse.StatusCode)
		require.Equal(t, "test-readiness: failed readiness on purpose\n", rec.Body.String())
		httpResponse.Body.Close()
	})
}
