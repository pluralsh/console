//go:build exclude

package server

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"
	"google.golang.org/protobuf/types/known/durationpb"

	"github.com/pluralsh/kubernetes-agent/pkg/kascfg"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/module/usage_metrics"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/matcher"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_usage_metrics"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

var (
	_ modserver.Module        = &module{}
	_ modserver.Factory       = &Factory{}
	_ modserver.ApplyDefaults = ApplyDefaults
)

func TestSendUsage(t *testing.T) {
	t.Parallel()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	uniqueCounter := []int64{1, 2}
	counters, uniqueCounters, payload := setUpPayload(5, uniqueCounter)

	m, tracker, _ := setupModule(t, func(w http.ResponseWriter, r *http.Request) {
		assertNoContentRequest(t, r, payload)
		w.WriteHeader(http.StatusNoContent)
	})
	ud := &usage_metrics.UsageData{Counters: counters, UniqueCounters: uniqueCounters}
	gomock.InOrder(
		tracker.EXPECT().
			CloneUsageData().
			Return(ud),
		tracker.EXPECT().
			Subtract(ud),
		tracker.EXPECT().
			CloneUsageData().
			DoAndReturn(func() *usage_metrics.UsageData {
				cancel()
				return &usage_metrics.UsageData{}
			}),
		tracker.EXPECT().
			CloneUsageData().
			Return(&usage_metrics.UsageData{}),
	)
	require.NoError(t, m.Run(ctx))
}

func TestSendUsageFailureAndRetry(t *testing.T) {
	t.Parallel()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	uniqueCounter := []int64{1, 2}
	uniqueCounter2 := []int64{6, 7}
	counters, uniqueCounters, payload := setUpPayload(5, uniqueCounter)
	ud1 := &usage_metrics.UsageData{Counters: counters, UniqueCounters: uniqueCounters}
	counters2, uniqueCounters2, payload2 := setUpPayload(10, uniqueCounter2)
	ud2 := &usage_metrics.UsageData{Counters: counters2, UniqueCounters: uniqueCounters2}
	var call int
	m, tracker, mockApi := setupModule(t, func(w http.ResponseWriter, r *http.Request) {
		call++
		switch call {
		case 1:
			assertNoContentRequest(t, r, payload)
			w.WriteHeader(http.StatusInternalServerError)
		case 2:
			assertNoContentRequest(t, r, payload2)
			w.WriteHeader(http.StatusNoContent)
		default:
			assert.Fail(t, "unexpected call", call)
		}
	})
	gomock.InOrder(
		tracker.EXPECT().
			CloneUsageData().
			Return(ud1),
		mockApi.EXPECT().
			HandleProcessingError(gomock.Any(), gomock.Any(), modshared.NoAgentId, "Failed to send usage data", matcher.ErrorEq("HTTP status code: 500 for path /api/v4/internal/kubernetes/usage_metrics")),
		tracker.EXPECT().
			CloneUsageData().
			Return(ud2),
		tracker.EXPECT().
			Subtract(ud2),
		tracker.EXPECT().
			CloneUsageData().
			DoAndReturn(func() *usage_metrics.UsageData {
				cancel()
				return &usage_metrics.UsageData{}
			}),
		tracker.EXPECT().
			CloneUsageData().
			Return(&usage_metrics.UsageData{}),
	)
	require.NoError(t, m.Run(ctx))
}

func TestSendUsageHttp(t *testing.T) {
	t.Parallel()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	uniqueCounter := []int64{1, 2}
	counters, uniqueCounters, payload := setUpPayload(5, uniqueCounter)
	ud := &usage_metrics.UsageData{Counters: counters, UniqueCounters: uniqueCounters}

	m, tracker, _ := setupModule(t, func(w http.ResponseWriter, r *http.Request) {
		assertNoContentRequest(t, r, payload)
		w.WriteHeader(http.StatusNoContent)
	})

	gomock.InOrder(
		tracker.EXPECT().
			CloneUsageData().
			Return(ud),
		tracker.EXPECT().
			Subtract(ud).
			Do(func(ud *usage_metrics.UsageData) {
				cancel()
			}),
		tracker.EXPECT().
			CloneUsageData().
			Return(&usage_metrics.UsageData{}),
	)
	require.NoError(t, m.Run(ctx))
}

func setupModule(t *testing.T, _ func(http.ResponseWriter, *http.Request)) (*module, *mock_usage_metrics.MockUsageTrackerInterface, *mock_modserver.MockApi) {
	ctrl := gomock.NewController(t)
	tracker := mock_usage_metrics.NewMockUsageTrackerInterface(ctrl)
	mockApi := mock_modserver.NewMockApi(ctrl)
	f := Factory{
		UsageTracker: tracker,
	}
	config := &kascfg.ConfigurationFile{}
	ApplyDefaults(config)
	config.Observability.UsageReportingPeriod = durationpb.New(100 * time.Millisecond)
	m, err := f.New(&modserver.Config{
		Log:          zaptest.NewLogger(t),
		Api:          mockApi,
		Config:       config,
		UsageTracker: tracker,
	})
	require.NoError(t, err)
	return m.(*module), tracker, mockApi
}

func assertNoContentRequest(t *testing.T, r *http.Request, expectedPayload interface{}) {
	testhelpers.AssertRequestMethod(t, r, http.MethodPost)
	assert.Empty(t, r.Header[httpz.AcceptHeader])
	testhelpers.AssertRequestContentTypeJson(t, r)
	testhelpers.AssertRequestUserAgent(t, r, testhelpers.KasUserAgent)
	testhelpers.AssertJWTSignature(t, r)
	expectedBin, err := json.Marshal(expectedPayload)
	if !assert.NoError(t, err) {
		return
	}
	var expected interface{}
	err = json.Unmarshal(expectedBin, &expected)
	if !assert.NoError(t, err) {
		return
	}
	actualBin, err := io.ReadAll(r.Body)
	if !assert.NoError(t, err) {
		return
	}
	var actual interface{}
	err = json.Unmarshal(actualBin, &actual)
	if !assert.NoError(t, err) {
		return
	}
	assert.Equal(t, expected, actual)
}

func setUpPayload(counter int64, uniqueCounter []int64) (map[string]int64, map[string][]int64, map[string]interface{}) {
	payload := map[string]interface{}{}
	var counters = map[string]int64{
		"x": counter,
	}
	var uniqueCounters = map[string][]int64{
		"x": uniqueCounter,
	}
	payload["counters"] = counters
	payload["unique_counters"] = uniqueCounters
	return counters, uniqueCounters, payload
}
