package kasapp

import (
	"context"
	"errors"
	"strconv"
	"testing"

	"github.com/getsentry/sentry-go"
	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/testing/protocmp"

	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/errz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

var (
	_ modserver.Api = (*serverApi)(nil)
)

func TestHandleProcessingError_UserError(t *testing.T) {
	ctx, log, _, apiObj, _ := setupApi(t)
	err := errz.NewUserError("boom")
	apiObj.HandleProcessingError(ctx, log, testhelpers.AgentId, "Bla", err)
}

func TestHandleProcessingError_NonUserError_AgentId(t *testing.T) {
	ctx, log, hub, apiObj, traceId := setupApi(t)
	err := errors.New("boom")
	hub.EXPECT().
		CaptureEvent(gomock.Any()).
		Do(func(event *sentry.Event) *sentry.EventID {
			assert.Equal(t, traceId.String(), event.Tags[modserver.SentryFieldTraceId])
			assert.Equal(t, strconv.FormatInt(testhelpers.AgentId, 10), event.User.ID)
			assert.Equal(t, sentry.LevelError, event.Level)
			assert.Equal(t, "*errors.errorString", event.Exception[0].Type)
			assert.Equal(t, "Bla: boom", event.Exception[0].Value)
			return nil
		})
	apiObj.HandleProcessingError(ctx, log, testhelpers.AgentId, "Bla", err)
}

func TestHandleProcessingError_NonUserError_NoAgentId_NoTraceId(t *testing.T) {
	_, log, hub, apiObj, _ := setupApi(t)
	err := errors.New("boom")
	hub.EXPECT().
		CaptureEvent(gomock.Any()).
		Do(func(event *sentry.Event) *sentry.EventID {
			assert.NotContains(t, event.Tags, modserver.SentryFieldTraceId)
			assert.Empty(t, event.User.ID)
			assert.Equal(t, sentry.LevelError, event.Level)
			assert.Equal(t, "*errors.errorString", event.Exception[0].Type)
			assert.Equal(t, "Bla: boom", event.Exception[0].Value)
			return nil
		})
	apiObj.HandleProcessingError(context.Background(), log, modshared.NoAgentId, "Bla", err)
}

func setupApi(t *testing.T) (context.Context, *zap.Logger, *MockSentryHub, *serverApi, trace.TraceID) {
	log := zaptest.NewLogger(t)
	ctrl := gomock.NewController(t)
	hub := NewMockSentryHub(ctrl)
	ctx, traceId := testhelpers.CtxWithSpanContext(t)
	apiObj := newServerApi(log, hub, nil)
	return ctx, log, hub, apiObj, traceId
}

func TestRemoveRandomPort(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{
			input:    "",
			expected: "",
		},
		{
			input:    "bla",
			expected: "bla",
		},
		{
			input:    "read tcp 10.222.67.20:40272->10.216.1.45:11443: read: connection reset by peer",
			expected: "read tcp 10.222.67.20:x->10.216.1.45:11443: read: connection reset by peer",
		},
		{
			input:    "some error with ip and port 10.222.67.20:40272: bla",
			expected: "some error with ip and port 10.222.67.20:40272: bla",
		},
	}
	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			actual := removeRandomPort(tc.input)
			assert.Equal(t, tc.expected, actual)
		})
	}
}

func TestRedisMarshalAndUnmarshal(t *testing.T) {
	mIn := &GatewayKasResponse_Header{
		Meta: map[string]*prototool.Values{
			"key": {Value: []string{"1", "2"}},
		},
	}
	msg, err := redisProtoMarshal(mIn)
	require.NoError(t, err)
	mOut, err := redisProtoUnmarshal(string(msg))
	require.NoError(t, err)

	assert.Empty(t, cmp.Diff(mIn, mOut, protocmp.Transform()))
}

func TestRedisUnmarshalErr(t *testing.T) {
	_, err := redisProtoUnmarshal("")
	assert.True(t, errors.Is(err, proto.Error))
}
