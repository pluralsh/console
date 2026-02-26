package testhelpers

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"net/http"
	"reflect"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	"github.com/pluralsh/kubernetes-agent/pkg/api"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/retry"
)

const (
	KasUserAgent                 = "kas/v0.1-blabla/asdwd"
	AgentkToken   api.AgentToken = "123123"
	AuthSecretKey                = "blablabla"

	// Copied from gitlab client package because we don't want to export them

	jwtRequestHeader  = "Gitlab-Kas-Api-Request"
	jwtGitLabAudience = "gitlab"
	jwtIssuer         = "gitlab-kas"

	AgentId   int64 = 123
	ClusterId       = "321"
	UserId    int64 = 456
)

// RespondWithJSON marshals response into JSON and writes it into w.
func RespondWithJSON(t *testing.T, w http.ResponseWriter, response interface{}) {
	var data []byte
	var err error
	if m, ok := response.(proto.Message); ok {
		data, err = protojson.Marshal(m)
	} else {
		data, err = json.Marshal(response)
	}
	if !assert.NoError(t, err) {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header()[httpz.ContentTypeHeader] = []string{"application/json"}
	_, err = w.Write(data)
	assert.NoError(t, err)
}

func AssertRequestMethod(t *testing.T, r *http.Request, method string) {
	assert.Equal(t, method, r.Method)
}

func AssertRequestAccept(t *testing.T, r *http.Request, accept string) {
	assert.Equal(t, accept, r.Header.Get(httpz.AcceptHeader))
}

func AssertRequestUserAgent(t *testing.T, r *http.Request, userAgent string) {
	assert.Equal(t, userAgent, r.Header.Get(httpz.UserAgentHeader))
}

func AssertRequestAcceptJson(t *testing.T, r *http.Request) {
	AssertRequestAccept(t, r, "application/json")
}

func AssertRequestContentTypeJson(t *testing.T, r *http.Request) {
	assert.Equal(t, "application/json", r.Header.Get(httpz.ContentTypeHeader))
}

func AssertGetJsonRequest(t *testing.T, r *http.Request) {
	AssertRequestMethod(t, r, http.MethodGet)
	AssertRequestAcceptJson(t, r)
}

func AssertAgentToken(t *testing.T, r *http.Request, agentToken api.AgentToken) {
	assert.EqualValues(t, "Bearer "+agentToken, r.Header.Get(httpz.AuthorizationHeader))
}

func AssertGetJsonRequestIsCorrect(t *testing.T, r *http.Request, traceId trace.TraceID) {
	AssertRequestAcceptJson(t, r)
	AssertGetRequestIsCorrect(t, r, traceId)
}

func AssertGetRequestIsCorrect(t *testing.T, r *http.Request, traceId trace.TraceID) {
	AssertRequestMethod(t, r, http.MethodGet)
	AssertAgentToken(t, r, AgentkToken)
	assert.Empty(t, r.Header[httpz.ContentTypeHeader])
	AssertCommonRequestParams(t, r, traceId)
	AssertJWTSignature(t, r)
}

func AssertCommonRequestParams(t *testing.T, r *http.Request, traceId trace.TraceID) {
	AssertRequestUserAgent(t, r, KasUserAgent)
	assert.Equal(t, traceId, trace.SpanContextFromContext(r.Context()).TraceID())
}

func AssertJWTSignature(t *testing.T, r *http.Request) {
	_, err := jwt.Parse(r.Header.Get(jwtRequestHeader), func(token *jwt.Token) (interface{}, error) {
		return []byte(AuthSecretKey), nil
	}, jwt.WithAudience(jwtGitLabAudience), jwt.WithIssuer(jwtIssuer), jwt.WithValidMethods([]string{"HS256"}))
	assert.NoError(t, err)
}

func CtxWithSpanContext(t *testing.T) (context.Context, trace.TraceID) {
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	return InjectSpanContext(t, ctx)
}

func InjectSpanContext(t *testing.T, ctx context.Context) (context.Context, trace.TraceID) {
	var traceId trace.TraceID
	var spanId trace.SpanID
	_, err := rand.Read(traceId[:]) // nolint:gosec
	require.NoError(t, err)
	_, err = rand.Read(spanId[:]) // nolint:gosec
	require.NoError(t, err)

	sc := trace.SpanContext{}.WithTraceID(traceId).WithSpanID(spanId)
	ctx = trace.ContextWithSpanContext(ctx, sc)
	return ctx, traceId
}

func AgentInfoObj() *api.AgentInfo {
	return &api.AgentInfo{
		Id:        AgentId,
		Name:      "agent1",
		ClusterId: ClusterId,
	}
}

func RecvMsg(value interface{}) func(any) error {
	return func(msg any) error {
		SetValue(msg, value)
		return nil
	}
}

// SetValue sets target to value.
// target must be a pointer. i.e. *blaProtoMsgType
// value must be of the same type as target.
func SetValue(target, value interface{}) {
	if targetMsg, ok := target.(proto.Message); ok {
		proto.Merge(targetMsg, value.(proto.Message)) // proto messages cannot be just copied
	} else {
		reflect.ValueOf(target).Elem().Set(reflect.ValueOf(value).Elem())
	}
}

func NewPollConfig(interval time.Duration) retry.PollConfigFactory {
	return retry.NewPollConfigFactory(interval, retry.NewExponentialBackoffFactory(time.Minute, time.Minute, time.Minute, 2, 1))
}
