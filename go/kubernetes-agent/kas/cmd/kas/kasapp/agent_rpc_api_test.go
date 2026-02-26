package kasapp

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"testing"

	"github.com/getsentry/sentry-go"
	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/kubernetes-agent/pkg/api"
	modserver2 "github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	modshared2 "github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/cache"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/errz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_cache"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

var (
	_ modserver2.RpcApi             = (*serverRpcApi)(nil)
	_ modserver2.RpcApiFactory      = (*serverRpcApiFactory)(nil).New
	_ modserver2.AgentRpcApi        = (*serverAgentRpcApi)(nil)
	_ modserver2.AgentRpcApiFactory = (*serverAgentRpcApiFactory)(nil).New
)

func TestGetAgentInfo_Errors(t *testing.T) {
	t.Skip()
	tests := []struct {
		httpStatus int
		code       codes.Code
		captureErr string
	}{
		{
			httpStatus: http.StatusForbidden,
			code:       codes.PermissionDenied,
		},
		{
			httpStatus: http.StatusUnauthorized,
			code:       codes.Unauthenticated,
		},
		{
			httpStatus: http.StatusNotFound,
			code:       codes.NotFound,
		},
		{
			httpStatus: http.StatusInternalServerError,
			captureErr: "HTTP status code: 500 for path /api/v4/internal/kubernetes/agent_info",
			code:       codes.Unavailable,
		},
		{
			httpStatus: http.StatusBadGateway,
			captureErr: "HTTP status code: 502 for path /api/v4/internal/kubernetes/agent_info",
			code:       codes.Unavailable,
		},
		{
			httpStatus: http.StatusServiceUnavailable,
			captureErr: "HTTP status code: 503 for path /api/v4/internal/kubernetes/agent_info",
			code:       codes.Unavailable,
		},
	}
	for _, tc := range tests {
		t.Run(strconv.Itoa(tc.httpStatus), func(t *testing.T) {
			ctx, log, hub, rpcApi, traceId := setupAgentRpcApi(t, tc.httpStatus)
			if tc.captureErr != "" {
				hub.EXPECT().
					CaptureEvent(gomock.Any()).
					Do(func(event *sentry.Event) *sentry.EventID {
						assert.Equal(t, traceId.String(), event.Tags[modserver2.SentryFieldTraceId])
						assert.Empty(t, event.User.ID)
						assert.Equal(t, sentry.LevelError, event.Level)
						assert.Equal(t, "*gitlab.ClientError", event.Exception[0].Type)
						assert.Equal(t, "AgentInfo(): "+tc.captureErr, event.Exception[0].Value)
						return nil
					})
			}
			info, err := rpcApi.AgentInfo(ctx, log)
			assert.Equal(t, tc.code, status.Code(err))
			assert.Nil(t, info)
		})
	}
}

func TestRpcHandleProcessingError_UserError(t *testing.T) {
	_, log, _, rpcApi, _ := setupAgentRpcApi(t, http.StatusInternalServerError)
	err := errz.NewUserError("boom")
	rpcApi.HandleProcessingError(log, testhelpers.AgentId, "Bla", err)
}

func TestRpcHandleProcessingError_NonUserError_AgentId(t *testing.T) {
	_, log, hub, rpcApi, traceId := setupAgentRpcApi(t, http.StatusInternalServerError)
	err := errors.New("boom")
	hub.EXPECT().
		CaptureEvent(gomock.Any()).
		Do(func(event *sentry.Event) *sentry.EventID {
			assert.Equal(t, traceId.String(), event.Tags[modserver2.SentryFieldTraceId])
			assert.Equal(t, strconv.FormatInt(testhelpers.AgentId, 10), event.User.ID)
			assert.Equal(t, sentry.LevelError, event.Level)
			assert.Equal(t, "*errors.errorString", event.Exception[0].Type)
			assert.Equal(t, "Bla: boom", event.Exception[0].Value)
			return nil
		})
	rpcApi.HandleProcessingError(log, testhelpers.AgentId, "Bla", err)
}

func TestRpcHandleProcessingError_NonUserError_NoAgentId(t *testing.T) {
	_, log, hub, rpcApi, traceId := setupAgentRpcApi(t, http.StatusInternalServerError)
	err := errors.New("boom")
	hub.EXPECT().
		CaptureEvent(gomock.Any()).
		Do(func(event *sentry.Event) *sentry.EventID {
			assert.Equal(t, traceId.String(), event.Tags[modserver2.SentryFieldTraceId])
			assert.Empty(t, event.User.ID)
			assert.Equal(t, sentry.LevelError, event.Level)
			assert.Equal(t, "*errors.errorString", event.Exception[0].Type)
			assert.Equal(t, "Bla: boom", event.Exception[0].Value)
			return nil
		})
	rpcApi.HandleProcessingError(log, modshared2.NoAgentId, "Bla", err)
}

func setupAgentRpcApi(t *testing.T, _ int) (context.Context, *zap.Logger, *MockSentryHub, *serverAgentRpcApi, trace.TraceID) {
	log := zaptest.NewLogger(t)
	ctrl := gomock.NewController(t)
	hub := NewMockSentryHub(ctrl)
	errCacher := mock_cache.NewMockErrCacher[api.AgentToken](ctrl)
	ctx, traceId := testhelpers.CtxWithSpanContext(t)
	sra := &serverRpcApi{
		RpcApiStub: modshared2.RpcApiStub{
			Logger:    log,
			StreamCtx: ctx,
		},
		sentryHubRoot: sentry.NewHub(nil, sentry.NewScope()),
		service:       "svc",
		method:        "method",
	}
	sra.hub() // so that Once fires here and doesn't overwrite our mock later
	sra.sentryHub = hub

	rpcApi := &serverAgentRpcApi{
		RpcApi: sra,
		Token:  testhelpers.AgentkToken,
		AgentInfoCache: cache.NewWithError[api.AgentToken, *api.AgentInfo](0, 0, errCacher,
			trace.NewNoopTracerProvider().Tracer(kasTracerName),
			func(err error) bool { return false }), // no cache!
	}
	return ctx, log, hub, rpcApi, traceId
}
