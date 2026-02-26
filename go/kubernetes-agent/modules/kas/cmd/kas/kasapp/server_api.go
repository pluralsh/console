package kasapp

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"regexp"
	"strconv"
	"time"
	"unsafe"

	"github.com/getsentry/sentry-go"

	"github.com/pluralsh/kubernetes-agent/pkg/event"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/errz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/retry"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/syncz"

	"github.com/redis/rueidis"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
)

var (
	// Help deduplicate errors like:
	//    read tcp 10.222.67.20:40272->10.216.1.45:11443: read: connection reset by peer
	// by removing the random egress port.

	ipv4 = `(?:\d+\.){3}\d+`

	removePortStdLibError = regexp.MustCompile(`(` + ipv4 + `:)\d+(->` + ipv4 + `:\d+)`)
)

const (
	redisAttemptInterval = 50 * time.Millisecond
	redisInitBackoff     = 100 * time.Millisecond
	redisMaxBackoff      = 10 * time.Second
	redisResetDuration   = 20 * time.Second
	redisBackoffFactor   = 2.0
	redisJitter          = 1.0
)

type SentryHub interface {
	CaptureEvent(event *sentry.Event) *sentry.EventID
}

type serverApi struct {
	log             *zap.Logger
	Hub             SentryHub
	redisClient     rueidis.Client
	gitPushEvent    syncz.Subscriptions[*event.GitPushEvent]
	redisPollConfig retry.PollConfigFactory
}

func newServerApi(log *zap.Logger, hub SentryHub, redisClient rueidis.Client) *serverApi {
	return &serverApi{
		log:         log,
		Hub:         hub,
		redisClient: redisClient,
		redisPollConfig: retry.NewPollConfigFactory(redisAttemptInterval, retry.NewExponentialBackoffFactory(
			redisInitBackoff,
			redisMaxBackoff,
			redisResetDuration,
			redisBackoffFactor,
			redisJitter,
		)),
	}
}

func (a *serverApi) HandleProcessingError(ctx context.Context, log *zap.Logger, agentId int64, msg string, err error) {
	handleProcessingError(ctx, a.hub, log, agentId, msg, err)
}

func (a *serverApi) hub() (SentryHub, string) {
	return a.Hub, ""
}

func (a *serverApi) OnGitPushEvent(ctx context.Context, cb syncz.EventCallback[*event.GitPushEvent]) {
	a.gitPushEvent.On(ctx, cb)
}

func redisProtoMarshal(m proto.Message) ([]byte, error) {
	a, err := anypb.New(m) // use Any to capture type information so that a value can be instantiated in redisProtoUnmarshal()
	if err != nil {
		return nil, err
	}
	return proto.Marshal(a)
}

func redisProtoUnmarshal(payload string) (proto.Message, error) {
	var a anypb.Any
	// Avoid creating a temporary copy
	payloadBytes := unsafe.Slice(unsafe.StringData(payload), len(payload))
	err := proto.Unmarshal(payloadBytes, &a)
	if err != nil {
		return nil, err
	}
	return a.UnmarshalNew()
}

func handleProcessingError(ctx context.Context, hub func() (SentryHub, string), log *zap.Logger, agentId int64, msg string, err error) {
	if grpctool.RequestCanceledOrTimedOut(err) {
		// An error caused by context signalling done
		return
	}
	var ue errz.UserError
	isUserError := errors.As(err, &ue)
	if isUserError {
		// TODO Don't log it, send it somewhere the user can see it https://gitlab.com/gitlab-org/gitlab/-/issues/277323
		// Log at Info for now.
		log.Info(msg, logz.Error(err))
	} else {
		h, transaction := hub()
		logAndCapture(ctx, h, transaction, log, agentId, msg, err)
	}
}

func logAndCapture(ctx context.Context, hub SentryHub, transaction string, log *zap.Logger, agentId int64, msg string, err error) {
	log.Error(msg, logz.Error(err))

	errStr := removeRandomPort(err.Error())

	e := sentry.NewEvent()
	if agentId != modshared.NoAgentId {
		e.User.ID = strconv.FormatInt(agentId, 10)
	}
	e.Level = sentry.LevelError
	e.Exception = []sentry.Exception{
		{
			Type:       reflect.TypeOf(err).String(),
			Value:      fmt.Sprintf("%s: %s", msg, errStr),
			Stacktrace: sentry.ExtractStacktrace(err),
		},
	}
	tc := trace.SpanContextFromContext(ctx)
	traceId := tc.TraceID()
	if traceId.IsValid() {
		e.Tags[modserver.SentryFieldTraceId] = traceId.String()
		sampled := "false"
		if tc.IsSampled() {
			sampled = "true"
		}
		e.Tags[modserver.SentryFieldTraceSampled] = sampled
	}
	e.Transaction = transaction
	hub.CaptureEvent(e)
}

func removeRandomPort(err string) string {
	return removePortStdLibError.ReplaceAllString(err, "${1}x${2}")
}
