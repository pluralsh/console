//go:build exclude

package server

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel/propagation"
	tracesdk "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer"
	"k8s.io/apimachinery/pkg/util/wait"

	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	gapi "github.com/pluralsh/kubernetes-agent/pkg/gitlab/api"
	"github.com/pluralsh/kubernetes-agent/pkg/module/kubernetes_api"
	rpc2 "github.com/pluralsh/kubernetes-agent/pkg/module/kubernetes_api/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/cache"
	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/matcher"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_cache"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_kubernetes_api"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

const (
	jobToken            = "asdfgasdfxadf"
	personalAccessToken = "glpat-asdfgasdfxadf"
	requestPath         = "/api/bla"
	requestPayload      = "asdfndaskjfadsbfjsadhvfjhavfjasvf"
	responsePayload     = "jknkjnjkasdnfkjasdnfkasdnfjnkjn"
	queryParamValue     = "query-param-value with a space"
	queryParamName      = "q with a space"
)

func strptr(s string) *string {
	return &s
}

func TestProxy_CORSPreflight(t *testing.T) {
	_, _, client, req := setupProxyWithHandler(t, "/", func(w http.ResponseWriter, r *http.Request) {
		t.Fail() // unexpected invocation
	})

	req.Method = http.MethodOptions

	// set CORS headers
	req.Header.Set("Access-Control-Request-Method", "POST")
	req.Header.Set("Access-Control-Request-Headers", "Content-Type, Cookie, X-Csrf-Token, Gitlab-Agent-Id")

	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.EqualValues(t, http.StatusOK, resp.StatusCode)

	assertCorsHeaders(t, resp.Header)
	assertCorsPreflightHeaders(t, resp.Header)
}

func TestProxy_OriginIsNotAllowed(t *testing.T) {
	_, _, client, req := setupProxyWithHandler(t, "/", func(w http.ResponseWriter, r *http.Request) {
		t.Fail() // unexpected invocation
	})

	req.Method = http.MethodOptions
	req.Header.Set("Origin", "https://not-allowed.example.com")

	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.EqualValues(t, http.StatusForbidden, resp.StatusCode)
}

func assertCorsHeaders(t *testing.T, header http.Header) {
	// Assert headers used for CORS preflight and normal requests
	assert.Equal(t, header.Values("Access-Control-Allow-Origin"), []string{"kas.gitlab.example.com"})
	assert.Equal(t, header.Values("Access-Control-Allow-Credentials"), []string{"true"})
	assert.Equal(t, header.Values("Vary"), []string{"Origin"})
}

func assertCorsPreflightHeaders(t *testing.T, header http.Header) {
	// Assert CORS preflight response headers
	assert.Equal(t, header.Values("Access-Control-Allow-Headers"), []string{"Content-Type, Cookie, X-Csrf-Token, Gitlab-Agent-Id"})
	assert.Equal(t, header.Values("Access-Control-Allow-Methods"), []string{"GET, HEAD, POST, PUT, DELETE, CONNECT, OPTIONS, TRACE, PATCH"})
	assert.Equal(t, header.Values("Access-Control-Max-Age"), []string{"86400"})
}

func TestProxy_AuthorizationErrors(t *testing.T) {
	tests := []struct {
		name            string
		auth            []string
		cookie          *string
		agentIdHeader   []string
		csrfTokenHeader []string
		message         string
	}{
		{
			name:    "missing credentials",
			message: "Plural Agent Server: Unauthorized: no valid credentials provided",
		},
		{
			name:    "job token: multiple headers",
			auth:    []string{"a", "b"},
			message: "Plural Agent Server: Unauthorized: Authorization header: expecting a single header, got 2",
		},
		{
			name:    "job token: invalid format1",
			auth:    []string{"Token asdfadsf"},
			message: "Plural Agent Server: Unauthorized: Authorization header: expecting Bearer token",
		},
		{
			name:    "job token: invalid format2",
			auth:    []string{"Bearer asdfadsf"},
			message: "Plural Agent Server: Unauthorized: Authorization header: invalid value",
		},
		{
			name:    "job token: invalid agent id",
			auth:    []string{"Bearer ci:asdf:as"},
			message: `Plural Agent Server: Unauthorized: Authorization header: failed to parse: strconv.ParseInt: parsing "asdf": invalid syntax`,
		},
		{
			name:    "job token: empty token",
			auth:    []string{"Bearer ci:1:"},
			message: "Plural Agent Server: Unauthorized: Authorization header: empty token",
		},
		{
			name:    "job token: unknown token type",
			auth:    []string{"Bearer blabla:1:asd"},
			message: "Plural Agent Server: Unauthorized: Authorization header: unknown token type",
		},
		{
			name:    "cookie: empty string",
			cookie:  new(string),
			message: "Plural Agent Server: Unauthorized: _gitlab_kas cookie value must not be empty",
		},
		{
			name:    "cookie: missing agent ID header",
			cookie:  strptr("the cookie"),
			message: "Plural Agent Server: Unauthorized: exactly one agent id must be provided either in the \"Gitlab-Agent-Id\" header or \"gitlab-agent-id\" query parameter",
		},
		{
			name:          "cookie: multiple agent ID header values",
			cookie:        strptr("the cookie"),
			agentIdHeader: []string{"a", "b"},
			message:       "Plural Agent Server: Unauthorized: Gitlab-Agent-Id header must have exactly one value",
		},
		{
			name:          "cookie: invalid agent ID value",
			cookie:        strptr("the cookie"),
			agentIdHeader: []string{"abcd"},
			message:       "Plural Agent Server: Unauthorized: agent id in request: invalid value: \"abcd\"",
		},
		{
			name:          "cookie: missing CSRF token header",
			cookie:        strptr("the cookie"),
			agentIdHeader: []string{"1234"},
			message:       "Plural Agent Server: Unauthorized: exactly one CSRF token must be provided either in the \"X-Csrf-Token\" header or \"gitlab-csrf-token\" query parameter",
		},
		{
			name:            "cookie: multiple CSRF token header values",
			cookie:          strptr("the cookie"),
			agentIdHeader:   []string{"1234"},
			csrfTokenHeader: []string{"x", "y"},
			message:         "Plural Agent Server: Unauthorized: X-Csrf-Token header must have exactly one value",
		},
		{
			name:    "personal access token: invalid agent id",
			auth:    []string{"Bearer pat:asdf:as"},
			message: `Plural Agent Server: Unauthorized: Authorization header: failed to parse: strconv.ParseInt: parsing "asdf": invalid syntax`,
		},
		{
			name:    "personal access token token: empty token",
			auth:    []string{"Bearer pat:1:"},
			message: "Plural Agent Server: Unauthorized: Authorization header: empty token",
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, _, client, req := setupProxyWithHandler(t, "/", func(w http.ResponseWriter, r *http.Request) {
				t.Fail() // unexpected invocation
			})
			if len(tc.auth) > 0 {
				req.Header[httpz.AuthorizationHeader] = tc.auth
			}
			if tc.cookie != nil {
				req.AddCookie(&http.Cookie{Name: gitLabKasCookieName, Value: *tc.cookie})
			}
			if len(tc.agentIdHeader) > 0 {
				req.Header[httpz.GitlabAgentIdHeader] = tc.agentIdHeader
			}
			if len(tc.csrfTokenHeader) > 0 {
				req.Header[httpz.CsrfTokenHeader] = tc.csrfTokenHeader
			}
			resp, err := client.Do(req)
			require.NoError(t, err)
			defer resp.Body.Close()
			assert.EqualValues(t, http.StatusUnauthorized, resp.StatusCode)
			expected := metav1.Status{
				TypeMeta: metav1.TypeMeta{
					Kind:       "Status",
					APIVersion: "v1",
				},
				Status: metav1.StatusFailure,
				Reason: metav1.StatusReasonUnauthorized,
				Code:   http.StatusUnauthorized,
			}
			actualStatus := readStatus(t, resp)
			assert.True(t, strings.HasPrefix(actualStatus.Message, tc.message+". Trace ID: "))
			assert.Empty(t, cmp.Diff(expected, actualStatus, cmpopts.IgnoreFields(metav1.Status{}, "Message")))
		})
	}
}

func TestProxy_AllowedAgentsError(t *testing.T) {
	tests := []struct {
		allowedAgentsHttpStatus int
		expectedHttpStatus      int
		message                 string
		captureErr              bool
	}{
		{
			allowedAgentsHttpStatus: http.StatusUnauthorized, // token is invalid
			expectedHttpStatus:      http.StatusUnauthorized,
			message:                 "Plural Agent Server: Unauthorized: CI job token: HTTP status code: 401 for path /api/v4/job/allowed_agents",
		},
		{
			allowedAgentsHttpStatus: http.StatusForbidden, // token is forbidden
			expectedHttpStatus:      http.StatusForbidden,
			message:                 "Plural Agent Server: Forbidden: CI job token: HTTP status code: 403 for path /api/v4/job/allowed_agents",
		},
		{
			allowedAgentsHttpStatus: http.StatusNotFound, // agent is not found
			expectedHttpStatus:      http.StatusNotFound,
			message:                 "Plural Agent Server: Not found: agents for CI job token: HTTP status code: 404 for path /api/v4/job/allowed_agents",
		},
		{
			allowedAgentsHttpStatus: http.StatusBadGateway, // some weird error
			expectedHttpStatus:      http.StatusInternalServerError,
			message:                 "Plural Agent Server: Failed to get allowed agents for CI job token: HTTP status code: 502 for path /api/v4/job/allowed_agents",
			captureErr:              true,
		},
	}
	for _, tc := range tests {
		t.Run(strconv.Itoa(tc.allowedAgentsHttpStatus), func(t *testing.T) {
			api, _, client, req := setupProxyWithHandler(t, "/", func(w http.ResponseWriter, r *http.Request) {
				assertToken(t, r)
				w.WriteHeader(tc.allowedAgentsHttpStatus)
			})
			if tc.captureErr {
				api.EXPECT().
					HandleProcessingError(gomock.Any(), gomock.Any(), testhelpers.AgentId, gomock.Any(),
						matcher.ErrorEq(fmt.Sprintf("HTTP status code: %d for path /api/v4/job/allowed_agents", tc.allowedAgentsHttpStatus)))
			}
			req.Header.Set(httpz.AuthorizationHeader, fmt.Sprintf("Bearer %s:%d:%s", tokenTypeCi, testhelpers.AgentId, jobToken))
			resp, err := client.Do(req)
			require.NoError(t, err)
			defer resp.Body.Close()
			assert.EqualValues(t, tc.expectedHttpStatus, resp.StatusCode)
			expected := metav1.Status{
				TypeMeta: metav1.TypeMeta{
					Kind:       "Status",
					APIVersion: "v1",
				},
				Status: metav1.StatusFailure,
				Reason: code2reason[int32(tc.expectedHttpStatus)],
				Code:   int32(tc.expectedHttpStatus),
			}
			actualStatus := readStatus(t, resp)
			assert.True(t, strings.HasPrefix(actualStatus.Message, tc.message+". Trace ID: "))
			assert.Empty(t, cmp.Diff(expected, actualStatus, cmpopts.IgnoreFields(metav1.Status{}, "Message")))
		})
	}
}

func TestProxy_AuthorizeProxyUserError(t *testing.T) {
	tests := []struct {
		authorizeProxyUserHttpStatus    int
		authorizeProxyUserContentType   string
		authorizeProxyUserFailureReason []byte
		expectedHttpStatus              int
		expectedErrReason               string
		message                         string
		captureErr                      bool
	}{
		{
			authorizeProxyUserHttpStatus:    http.StatusUnauthorized, // invalid credentials
			authorizeProxyUserContentType:   "application/json",
			authorizeProxyUserFailureReason: []byte(`{"message": "unauthorized"}`),
			expectedHttpStatus:              http.StatusUnauthorized,
			expectedErrReason:               "unauthorized",
			message:                         "Plural Agent Server: Unauthorized",
		},
		{
			authorizeProxyUserHttpStatus:    http.StatusForbidden, // user has no access to agent
			authorizeProxyUserContentType:   "application/json",
			authorizeProxyUserFailureReason: []byte(`{"message": "forbidden"}`),
			expectedHttpStatus:              http.StatusUnauthorized,
			expectedErrReason:               "forbidden",
			message:                         "Plural Agent Server: Unauthorized",
		},
		{
			authorizeProxyUserHttpStatus:    http.StatusNotFound, // user or agent not found
			authorizeProxyUserContentType:   "application/json",
			authorizeProxyUserFailureReason: []byte(`{"message": "not found"}`),
			expectedHttpStatus:              http.StatusUnauthorized,
			expectedErrReason:               "not found",
			message:                         "Plural Agent Server: Unauthorized",
		},
		{
			authorizeProxyUserHttpStatus:  http.StatusBadGateway, // some weird error
			authorizeProxyUserContentType: "text/plain",
			expectedHttpStatus:            http.StatusInternalServerError,
			expectedErrReason:             "<unknown reason: expected application/json content type, but got text/plain>",
			message:                       "Plural Agent Server: Failed to authorize user session",
			captureErr:                    true,
		},
	}
	for _, tc := range tests {
		t.Run(strconv.Itoa(tc.authorizeProxyUserHttpStatus), func(t *testing.T) {
			api, _, client, req := setupProxyWithHandler(t, "/", func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set(httpz.ContentTypeHeader, tc.authorizeProxyUserContentType)
				w.WriteHeader(tc.authorizeProxyUserHttpStatus)
				w.Write(tc.authorizeProxyUserFailureReason)
			})
			if tc.captureErr {
				api.EXPECT().
					HandleProcessingError(gomock.Any(), gomock.Any(), testhelpers.AgentId, gomock.Any(),
						matcher.ErrorEq(fmt.Sprintf("HTTP status code: %d for path /api/v4/internal/kubernetes/authorize_proxy_user with reason %s", tc.authorizeProxyUserHttpStatus, tc.expectedErrReason)))
			}
			setExpectedSessionCookieParamsInHeader(req)
			resp, err := client.Do(req)
			require.NoError(t, err)
			defer resp.Body.Close()
			assert.EqualValues(t, tc.expectedHttpStatus, resp.StatusCode)
			expected := metav1.Status{
				TypeMeta: metav1.TypeMeta{
					Kind:       "Status",
					APIVersion: "v1",
				},
				Status: metav1.StatusFailure,
				Reason: code2reason[int32(tc.expectedHttpStatus)],
				Code:   int32(tc.expectedHttpStatus),
			}
			assertCorsHeaders(t, resp.Header)
			actualStatus := readStatus(t, resp)
			assert.True(t, strings.HasPrefix(actualStatus.Message, tc.message+". Trace ID: "))
			assert.Empty(t, cmp.Diff(expected, actualStatus, cmpopts.IgnoreFields(metav1.Status{}, "Message")))
		})
	}
}

func TestProxy_NoExpectedUrlPathPrefix(t *testing.T) {
	_, _, client, req := setupProxyWithHandler(t, "/bla/", configCiAccessPluralHandler(t, nil, nil))
	req.URL.Path = requestPath
	req.Header.Set(httpz.AuthorizationHeader, fmt.Sprintf("Bearer %s:%d:%s", tokenTypeCi, testhelpers.AgentId, jobToken))
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.EqualValues(t, http.StatusBadRequest, resp.StatusCode)
	expected := metav1.Status{
		TypeMeta: metav1.TypeMeta{
			Kind:       "Status",
			APIVersion: "v1",
		},
		Status:  metav1.StatusFailure,
		Message: "Correlation ID: ",
		Reason:  metav1.StatusReasonBadRequest,
		Code:    http.StatusBadRequest,
	}
	actualStatus := readStatus(t, resp)
	assert.True(t, strings.HasPrefix(actualStatus.Message, "Plural Agent Server: Bad request: URL does not start with expected prefix. Trace ID: "))
	assert.Empty(t, cmp.Diff(expected, actualStatus, cmpopts.IgnoreFields(metav1.Status{}, "Message")))
}

func TestProxy_ForbiddenAgentId(t *testing.T) {
	_, _, client, req := setupProxy(t)
	req.Header.Set(httpz.AuthorizationHeader, fmt.Sprintf("Bearer %s:%d:%s", tokenTypeCi, 15 /* disallowed id */, jobToken))
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.EqualValues(t, http.StatusForbidden, resp.StatusCode)
	expected := metav1.Status{
		TypeMeta: metav1.TypeMeta{
			Kind:       "Status",
			APIVersion: "v1",
		},
		Status: metav1.StatusFailure,
		Reason: metav1.StatusReasonForbidden,
		Code:   http.StatusForbidden,
	}
	actualStatus := readStatus(t, resp)
	assert.True(t, strings.HasPrefix(actualStatus.Message, "Plural Agent Server: Forbidden: agentId is not allowed. Trace ID: "))
	assert.Empty(t, cmp.Diff(expected, actualStatus, cmpopts.IgnoreFields(metav1.Status{}, "Message")))
}

func TestProxy_CiAccessHappyPath(t *testing.T) {
	tests := []struct {
		name          string
		urlPathPrefix string
		config        *gapi.Configuration
		env           *gapi.Environment
		expectedExtra *rpc2.HeaderExtra
	}{
		{
			name:          "no prefix",
			urlPathPrefix: "/",
		},
		{
			name:          "with prefix",
			urlPathPrefix: "/bla/",
		},
		{
			name:          "impersonate agent",
			urlPathPrefix: "/",
			config: &gapi.Configuration{
				AccessAs: &agentcfg.CiAccessAsCF{
					As: &agentcfg.CiAccessAsCF_Agent{
						Agent: &agentcfg.CiAccessAsAgentCF{},
					},
				},
			},
		},
		{
			name:          "impersonate",
			urlPathPrefix: "/",
			config: &gapi.Configuration{
				AccessAs: &agentcfg.CiAccessAsCF{
					As: &agentcfg.CiAccessAsCF_Impersonate{
						Impersonate: &agentcfg.CiAccessAsImpersonateCF{
							Username: "user1",
							Groups:   []string{"g1", "g2"},
							Uid:      "uid",
							Extra: []*agentcfg.ExtraKeyValCF{
								{
									Key: "k1",
									Val: []string{"v1", "v2"},
								},
							},
						},
					},
				},
			},
			expectedExtra: &rpc2.HeaderExtra{
				ImpConfig: &rpc2.ImpersonationConfig{
					Username: "user1",
					Groups:   []string{"g1", "g2"},
					Uid:      "uid",
					Extra: []*rpc2.ExtraKeyVal{
						{
							Key: "k1",
							Val: []string{"v1", "v2"},
						},
					},
				},
			},
		},
		{
			name:          "impersonate ci job no env",
			urlPathPrefix: "/",
			config: &gapi.Configuration{
				AccessAs: &agentcfg.CiAccessAsCF{
					As: &agentcfg.CiAccessAsCF_CiJob{
						CiJob: &agentcfg.CiAccessAsCiJobCF{},
					},
				},
			},
			expectedExtra: &rpc2.HeaderExtra{
				ImpConfig: &rpc2.ImpersonationConfig{
					Username: "gitlab:ci_job:1",
					Groups:   []string{"gitlab:ci_job", "gitlab:group:6", "gitlab:project:3"},
					Extra: []*rpc2.ExtraKeyVal{
						{
							Key: "agent.gitlab.com/id",
							Val: []string{"123"},
						},
						{
							Key: "agent.gitlab.com/config_project_id",
							Val: []string{"5"},
						},
						{
							Key: "agent.gitlab.com/project_id",
							Val: []string{"3"},
						},
						{
							Key: "agent.gitlab.com/ci_pipeline_id",
							Val: []string{"2"},
						},
						{
							Key: "agent.gitlab.com/ci_job_id",
							Val: []string{"1"},
						},
						{
							Key: "agent.gitlab.com/username",
							Val: []string{"testuser"},
						},
					},
				},
			},
		},
		{
			name:          "impersonate ci job prod env",
			urlPathPrefix: "/",
			config: &gapi.Configuration{
				AccessAs: &agentcfg.CiAccessAsCF{
					As: &agentcfg.CiAccessAsCF_CiJob{
						CiJob: &agentcfg.CiAccessAsCiJobCF{},
					},
				},
			},
			env: &gapi.Environment{
				Slug: "prod",
				Tier: "production",
			},
			expectedExtra: &rpc2.HeaderExtra{
				ImpConfig: &rpc2.ImpersonationConfig{
					Username: "gitlab:ci_job:1",
					Groups:   []string{"gitlab:ci_job", "gitlab:group:6", "gitlab:group_env_tier:6:production", "gitlab:project:3", "gitlab:project_env:3:prod", "gitlab:project_env_tier:3:production"},
					Extra: []*rpc2.ExtraKeyVal{
						{
							Key: "agent.gitlab.com/id",
							Val: []string{"123"},
						},
						{
							Key: "agent.gitlab.com/config_project_id",
							Val: []string{"5"},
						},
						{
							Key: "agent.gitlab.com/project_id",
							Val: []string{"3"},
						},
						{
							Key: "agent.gitlab.com/ci_pipeline_id",
							Val: []string{"2"},
						},
						{
							Key: "agent.gitlab.com/ci_job_id",
							Val: []string{"1"},
						},
						{
							Key: "agent.gitlab.com/username",
							Val: []string{"testuser"},
						},
						{
							Key: "agent.gitlab.com/environment_slug",
							Val: []string{"prod"},
						},
						{
							Key: "agent.gitlab.com/environment_tier",
							Val: []string{"production"},
						},
					},
				},
			},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, k8sClient, client, req := setupProxyWithHandler(t, tc.urlPathPrefix, configCiAccessPluralHandler(t, tc.config, tc.env))
			testProxyHappyPath(t, setExpectedJobToken, tc.expectedExtra, k8sClient, client, req)
		})
	}
}

func setExpectedJobToken(req *http.Request) {
	req.Header.Set(httpz.AuthorizationHeader, fmt.Sprintf("Bearer %s:%d:%s", tokenTypeCi, testhelpers.AgentId, jobToken))
}

func TestProxy_PreferAuthorizationHeaderOverSessionCookie(t *testing.T) {
	var expectedExtra *rpc2.HeaderExtra // nil
	setJobTokenAndCookie := func(req *http.Request) {
		setExpectedJobToken(req)
		setExpectedSessionCookieParamsInHeader(req)
	}

	_, k8sClient, client, req := setupProxyWithHandler(t, "/", configCiAccessPluralHandler(t, nil, nil))
	testProxyHappyPath(t, setJobTokenAndCookie, expectedExtra, k8sClient, client, req)
}

func TestProxy_UserAccessHappyPath(t *testing.T) {
	authenticationMethods := []struct {
		name          string
		setParamsFunc func(r *http.Request)
	}{
		{name: "auth in header", setParamsFunc: setExpectedSessionCookieParamsInHeader},
		{name: "auth in params", setParamsFunc: setExpectedSessionCookieParamsInQuery},
	}
	testcases := []struct {
		name          string
		urlPathPrefix string
		auth          *gapi.AuthorizeProxyUserResponse
		expectedExtra *rpc2.HeaderExtra
	}{
		{
			name:          "impersonate agent",
			urlPathPrefix: "/",
			auth: &gapi.AuthorizeProxyUserResponse{
				AccessAs: &gapi.AccessAsProxyAuthorization{
					AccessAs: &gapi.AccessAsProxyAuthorization_Agent{
						Agent: &gapi.AccessAsAgentAuthorization{},
					},
				},
			},
		},
		{
			name:          "impersonate user",
			urlPathPrefix: "/",
			auth: &gapi.AuthorizeProxyUserResponse{
				AccessAs: &gapi.AccessAsProxyAuthorization{
					AccessAs: &gapi.AccessAsProxyAuthorization_User{
						User: &gapi.AccessAsUserAuthorization{
							Projects: []*gapi.ProjectAccessCF{
								{
									Id:    1234,
									Roles: []string{"guest", "developer"},
								},
							},
						},
					},
				},
			},
			expectedExtra: &rpc2.HeaderExtra{
				ImpConfig: &rpc2.ImpersonationConfig{
					Username: "gitlab:user:testuser",
					Groups: []string{
						"gitlab:user",
						"gitlab:project_role:1234:guest",
						"gitlab:project_role:1234:developer",
					},
					Extra: []*rpc2.ExtraKeyVal{
						{
							Key: "agent.gitlab.com/id",
							Val: []string{"123"},
						},
						{
							Key: "agent.gitlab.com/username",
							Val: []string{"testuser"},
						},
						{
							Key: "agent.gitlab.com/access_type",
							Val: []string{"session_cookie"},
						},
						{
							Key: "agent.gitlab.com/config_project_id",
							Val: []string{"5"},
						},
					},
				},
			},
		},
	}
	for _, atc := range authenticationMethods {
		for _, tc := range testcases {
			t.Run(fmt.Sprintf("%s-%s", atc.name, tc.name), func(t *testing.T) {
				tc.auth.Agent = &gapi.AuthorizedAgentForUser{
					Id:            testhelpers.AgentId,
					ConfigProject: &gapi.ConfigProject{Id: 5},
				}
				tc.auth.User = &gapi.User{
					Id:       testhelpers.UserId,
					Username: "testuser",
				}
				_, k8sClient, client, req := setupProxyWithHandler(t, tc.urlPathPrefix, configUserAccessPluralHandler(t, tc.auth))
				testProxyHappyPath(t, atc.setParamsFunc, tc.expectedExtra, k8sClient, client, req)
			})
		}
	}
}

func configUserAccessPluralHandler(t *testing.T, auth *gapi.AuthorizeProxyUserResponse) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, req *http.Request) {
		if !assertUserAccessCredentials(t, req) {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		testhelpers.RespondWithJSON(t, w, auth)
	}
}

func assertUserAccessCredentials(t *testing.T, req *http.Request) bool {
	data, err := io.ReadAll(req.Body)
	assert.NoError(t, err)
	auth := &gapi.AuthorizeProxyUserRequest{}
	err = protojson.Unmarshal(data, auth)
	return assert.NoError(t, err) &&
		assert.Equal(t, auth.AgentId, testhelpers.AgentId) &&
		assert.Equal(t, auth.AccessType, "session_cookie") &&
		assert.Equal(t, auth.AccessKey, "encrypted-session-cookie") &&
		assert.Equal(t, auth.CsrfToken, "the-csrf-token")
}

func setExpectedSessionCookieParamsInHeader(req *http.Request) {
	req.AddCookie(
		&http.Cookie{
			Name:  gitLabKasCookieName,
			Value: "encrypted-session-cookie",
		},
	)
	req.Header[httpz.GitlabAgentIdHeader] = []string{strconv.FormatInt(testhelpers.AgentId, 10)}
	req.Header[httpz.CsrfTokenHeader] = []string{"the-csrf-token"}
}

func setExpectedSessionCookieParamsInQuery(req *http.Request) {
	req.AddCookie(
		&http.Cookie{
			Name:  gitLabKasCookieName,
			Value: "encrypted-session-cookie",
		},
	)
	query := req.URL.Query()
	query[httpz.GitlabAgentIdQueryParam] = []string{strconv.FormatInt(testhelpers.AgentId, 10)}
	query[httpz.CsrfTokenQueryParam] = []string{"the-csrf-token"}
	req.URL.RawQuery = query.Encode()
}

func TestProxy_PersonalAccessTokenAccessHappyPath(t *testing.T) {
	testcases := []struct {
		name          string
		urlPathPrefix string
		auth          *gapi.AuthorizeProxyUserResponse
		expectedExtra *rpc2.HeaderExtra
	}{
		{
			name:          "impersonate agent",
			urlPathPrefix: "/",
			auth: &gapi.AuthorizeProxyUserResponse{
				AccessAs: &gapi.AccessAsProxyAuthorization{
					AccessAs: &gapi.AccessAsProxyAuthorization_Agent{
						Agent: &gapi.AccessAsAgentAuthorization{},
					},
				},
			},
		},
		{
			name:          "impersonate user",
			urlPathPrefix: "/",
			auth: &gapi.AuthorizeProxyUserResponse{
				AccessAs: &gapi.AccessAsProxyAuthorization{
					AccessAs: &gapi.AccessAsProxyAuthorization_User{
						User: &gapi.AccessAsUserAuthorization{
							Projects: []*gapi.ProjectAccessCF{
								{
									Id:    1234,
									Roles: []string{"guest", "developer"},
								},
							},
						},
					},
				},
			},
			expectedExtra: &rpc2.HeaderExtra{
				ImpConfig: &rpc2.ImpersonationConfig{
					Username: "gitlab:user:testuser",
					Groups: []string{
						"gitlab:user",
						"gitlab:project_role:1234:guest",
						"gitlab:project_role:1234:developer",
					},
					Extra: []*rpc2.ExtraKeyVal{
						{
							Key: "agent.gitlab.com/id",
							Val: []string{"123"},
						},
						{
							Key: "agent.gitlab.com/username",
							Val: []string{"testuser"},
						},
						{
							Key: "agent.gitlab.com/access_type",
							Val: []string{"personal_access_token"},
						},
						{
							Key: "agent.gitlab.com/config_project_id",
							Val: []string{"5"},
						},
					},
				},
			},
		},
	}
	for _, tc := range testcases {
		t.Run(fmt.Sprintf(tc.name), func(t *testing.T) {
			tc.auth.Agent = &gapi.AuthorizedAgentForUser{
				Id:            testhelpers.AgentId,
				ConfigProject: &gapi.ConfigProject{Id: 5},
			}
			tc.auth.User = &gapi.User{
				Id:       testhelpers.UserId,
				Username: "testuser",
			}
			_, k8sClient, client, req := setupProxyWithHandler(t, tc.urlPathPrefix, configPersonalAccessTokenAccessPluralHandler(t, tc.auth))
			testProxyHappyPath(t, setExpectedPersonalAccessToken, tc.expectedExtra, k8sClient, client, req)
		})
	}
}

func setExpectedPersonalAccessToken(req *http.Request) {
	req.Header.Set(httpz.AuthorizationHeader, fmt.Sprintf("Bearer %s:%d:%s", tokenTypePat, testhelpers.AgentId, personalAccessToken))
}

func configPersonalAccessTokenAccessPluralHandler(t *testing.T, auth *gapi.AuthorizeProxyUserResponse) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, req *http.Request) {
		if !assertPersonalAccessTokenAccessCredentials(t, req) {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		testhelpers.RespondWithJSON(t, w, auth)
	}
}

func assertPersonalAccessTokenAccessCredentials(t *testing.T, req *http.Request) bool {
	data, err := io.ReadAll(req.Body)
	assert.NoError(t, err)
	auth := &gapi.AuthorizeProxyUserRequest{}
	err = protojson.Unmarshal(data, auth)
	return assert.NoError(t, err) &&
		assert.Equal(t, auth.AgentId, testhelpers.AgentId) &&
		assert.Equal(t, auth.AccessType, "personal_access_token") &&
		assert.Equal(t, auth.AccessKey, personalAccessToken) &&
		assert.Equal(t, auth.CsrfToken, "")
}

func testProxyHappyPath(t *testing.T, prepareRequest func(*http.Request), expectedExtra *rpc2.HeaderExtra, k8sClient *mock_kubernetes_api.MockKubernetesApiClient, client *http.Client, req *http.Request) {
	prepareRequest(req)
	mrClient := mock_kubernetes_api.NewMockKubernetesApi_MakeRequestClient(gomock.NewController(t))
	mrCall := k8sClient.EXPECT().
		MakeRequest(gomock.Any()).
		DoAndReturn(func(ctx context.Context, opts ...grpc.CallOption) (rpc2.KubernetesApi_MakeRequestClient, error) {
			requireCorrectOutgoingMeta(t, ctx)
			return mrClient, nil
		})
	var extra *anypb.Any
	if expectedExtra != nil {
		var err error
		extra, err = anypb.New(expectedExtra)
		require.NoError(t, err)
	}
	contentLength := int64(len(requestPayload))
	send := mockSendStream(t, mrClient,
		&grpctool2.HttpRequest{
			Message: &grpctool2.HttpRequest_Header_{
				Header: &grpctool2.HttpRequest_Header{
					Request: &prototool.HttpRequest{
						Method: http.MethodPost,
						Header: map[string]*prototool.Values{
							"Req-Header": {
								Value: []string{"x1", "x2"},
							},
							"Accept-Encoding": { // added by the Go client
								Value: []string{"gzip"},
							},
							httpz.UserAgentHeader: {
								Value: []string{"test-agent"},
							},
							"Content-Length": { // added by the Go client
								Value: []string{strconv.Itoa(len(requestPayload))},
							},
							httpz.ViaHeader: {
								Value: []string{"gRPC/1.0 sv1"},
							},
							httpz.OriginHeader: {
								Value: []string{"kas.gitlab.example.com"},
							},
						},
						UrlPath: requestPath,
						Query: map[string]*prototool.Values{
							queryParamName: {
								Value: []string{queryParamValue},
							},
						},
					},
					Extra:         extra,
					ContentLength: &contentLength,
				},
			},
		},
		&grpctool2.HttpRequest{
			Message: &grpctool2.HttpRequest_Data_{
				Data: &grpctool2.HttpRequest_Data{
					Data: []byte(requestPayload),
				},
			},
		},
		&grpctool2.HttpRequest{
			Message: &grpctool2.HttpRequest_Trailer_{
				Trailer: &grpctool2.HttpRequest_Trailer{},
			},
		},
	)
	recv := mockRecvStream(mrClient,
		&grpctool2.HttpResponse{
			Message: &grpctool2.HttpResponse_Header_{
				Header: &grpctool2.HttpResponse_Header{
					Response: &prototool.HttpResponse{
						StatusCode: http.StatusOK,
						Status:     http.StatusText(http.StatusOK),
						Header: map[string]*prototool.Values{
							"Resp-Header": {
								Value: []string{"a1", "a2"},
							},
							"Content-Type": {
								Value: []string{"application/octet-stream"},
							},
							"Date": {
								Value: []string{"NOW!"},
							},
							// These headers are CORS headers and are being removed by the proxy
							httpz.AccessControlMaxAgeHeader: {
								Value: []string{"42"},
							},
						},
					},
				},
			},
		},
		&grpctool2.HttpResponse{
			Message: &grpctool2.HttpResponse_Data_{
				Data: &grpctool2.HttpResponse_Data{
					Data: []byte(responsePayload),
				},
			},
		},
		&grpctool2.HttpResponse{
			Message: &grpctool2.HttpResponse_Trailer_{
				Trailer: &grpctool2.HttpResponse_Trailer{},
			},
		},
	)
	calls := []any{mrCall}
	calls = append(calls, send...)
	calls = append(calls, recv...)
	gomock.InOrder(calls...)

	req.Header.Set("Req-Header", "x1")
	req.Header.Add("Req-Header", "x2")
	req.Header.Set(httpz.OriginHeader, "kas.gitlab.example.com")
	req.Header.Set(httpz.UserAgentHeader, "test-agent") // added manually to override what is added by the Go client
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer func() {
		assert.NoError(t, resp.Body.Close())
	}()
	assert.EqualValues(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, responsePayload, string(readAll(t, resp.Body)))
	delete(resp.Header, "Date")
	assert.Empty(t, cmp.Diff(map[string][]string{
		"Resp-Header":                      {"a1", "a2"},
		"Content-Type":                     {"application/octet-stream"},
		"Via":                              {"gRPC/1.0 sv1"},
		"Access-Control-Allow-Credentials": {"true"},
		"Access-Control-Allow-Origin":      {"kas.gitlab.example.com"},
		"Vary":                             {"Origin"},
	}, (map[string][]string)(resp.Header)))
}

func TestFormatStatusMessage(t *testing.T) {
	ctx, traceId := testhelpers.CtxWithSpanContext(t)
	tests := []struct {
		name            string
		ctx             context.Context
		err             error
		expectedMessage string
	}{
		{
			name:            "no err, no trace",
			ctx:             context.Background(),
			expectedMessage: "Plural Agent Server: msg",
		},
		{
			name:            "no err, trace",
			ctx:             ctx,
			expectedMessage: "Plural Agent Server: msg. Trace ID: " + traceId.String(),
		},
		{
			name:            "err, no trace",
			ctx:             context.Background(),
			err:             errors.New("boom"),
			expectedMessage: "Plural Agent Server: msg: boom",
		},
		{
			name:            "err, trace",
			ctx:             ctx,
			err:             errors.New("boom"),
			expectedMessage: "Plural Agent Server: msg: boom. Trace ID: " + traceId.String(),
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			msg := formatStatusMessage(test.ctx, "msg", test.err)
			assert.Equal(t, test.expectedMessage, msg)
		})
	}
}

func requireCorrectOutgoingMeta(t *testing.T, ctx context.Context) {
	md, _ := metadata.FromOutgoingContext(ctx)
	vals := md.Get(modserver.RoutingAgentIdMetadataKey)
	require.Len(t, vals, 1)
	agentId, err := strconv.ParseInt(vals[0], 10, 64)
	require.NoError(t, err)
	require.Equal(t, testhelpers.AgentId, agentId)
}

func assertToken(t *testing.T, r *http.Request) bool {
	return assert.Equal(t, jobToken, r.Header.Get("Job-Token"))
}

func setupProxy(t *testing.T) (
	*mock_modserver.MockApi, *mock_kubernetes_api.MockKubernetesApiClient, *http.Client, *http.Request) {
	return setupProxyWithHandler(t, "/", configCiAccessPluralHandler(t, nil, nil))
}

func configCiAccessPluralHandler(t *testing.T, config *gapi.Configuration, env *gapi.Environment) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if !assertToken(t, r) {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		testhelpers.RespondWithJSON(t, w, &gapi.AllowedAgentsForJob{
			AllowedAgents: []*gapi.AllowedAgent{
				{
					Id: testhelpers.AgentId,
					ConfigProject: &gapi.ConfigProject{
						Id: 5,
					},
					Configuration: config,
				},
			},
			Job: &gapi.Job{
				Id: 1,
			},
			Pipeline: &gapi.Pipeline{
				Id: 2,
			},
			Project: &gapi.Project{
				Id: 3,
				Groups: []*gapi.Group{
					{
						Id: 6,
					},
				},
			},
			User: &gapi.User{
				Id:       testhelpers.UserId,
				Username: "testuser",
			},
			Environment: env,
		})
	}
}

func setupProxyWithHandler(t *testing.T, urlPathPrefix string, _ func(http.ResponseWriter, *http.Request)) (
	*mock_modserver.MockApi, *mock_kubernetes_api.MockKubernetesApiClient, *http.Client, *http.Request) {
	ctrl := gomock.NewController(t)
	mockApi := mock_modserver.NewMockApi(ctrl)
	k8sClient := mock_kubernetes_api.NewMockKubernetesApiClient(ctrl)
	errCache := mock_cache.NewMockErrCacher[string](ctrl)
	proxyErrCache := mock_cache.NewMockErrCacher[proxyUserCacheKey](ctrl)

	tp := tracesdk.NewTracerProvider(tracesdk.WithSpanProcessor(tracetest.NewSpanRecorder()))
	tracer := tp.Tracer(kubernetes_api.ModuleName)

	p := kubernetesApiProxy{
		log:                 zaptest.NewLogger(t),
		api:                 mockApi,
		kubernetesApiClient: k8sClient,
		allowedOriginUrls:   []string{"kas.gitlab.example.com"},
		allowedAgentsCache: cache.NewWithError[string, *gapi.AllowedAgentsForJob](0, 0, errCache, tracer,
			func(err error) bool { return false }),
		authorizeProxyUserCache: cache.NewWithError[proxyUserCacheKey, *gapi.AuthorizeProxyUserResponse](0, 0, proxyErrCache, tracer,
			func(err error) bool { return false }),
		responseSerializer: serializer.NewCodecFactory(runtime.NewScheme()),
		traceProvider:      tp,
		tracePropagator:    propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}),
		serverName:         "sv1",
		serverVia:          "gRPC/1.0 sv1",
		urlPathPrefix:      urlPathPrefix,
	}
	listener := grpctool2.NewDialListener()
	var wg wait.Group
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(func() {
		cancel()
		wg.Wait()
		listener.Close()
	})
	wg.Start(func() {
		assert.NoError(t, p.Run(ctx, listener))
	})
	client := &http.Client{
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				return listener.DialContext(ctx, addr)
			},
		},
	}
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		"http://any_host_will_do.local"+path.Join(urlPathPrefix, requestPath)+"?"+url.QueryEscape(queryParamName)+"="+url.QueryEscape(queryParamValue),
		strings.NewReader(requestPayload),
	)
	req.Header.Set(httpz.OriginHeader, "kas.gitlab.example.com")
	require.NoError(t, err)
	return mockApi, k8sClient, client, req
}

func mockRecvStream(server *mock_kubernetes_api.MockKubernetesApi_MakeRequestClient, msgs ...proto.Message) []any {
	res := make([]any, 0, len(msgs)+1)
	for _, msg := range msgs {
		call := server.EXPECT().
			RecvMsg(gomock.Any()).
			Do(testhelpers.RecvMsg(msg))
		res = append(res, call)
	}
	call := server.EXPECT().
		RecvMsg(gomock.Any()).
		Return(io.EOF)
	res = append(res, call)
	return res
}

func mockSendStream(t *testing.T, client *mock_kubernetes_api.MockKubernetesApi_MakeRequestClient, msgs ...*grpctool2.HttpRequest) []any {
	res := make([]any, 0, len(msgs)+1)
	for _, msg := range msgs {
		call := client.EXPECT().
			Send(matcher.ProtoEq(t, msg))
		res = append(res, call)
	}
	res = append(res, client.EXPECT().CloseSend())
	return res
}

func readAll(t *testing.T, r io.Reader) []byte {
	data, err := io.ReadAll(r)
	require.NoError(t, err)
	return data
}

func readStatus(t *testing.T, resp *http.Response) metav1.Status {
	data := readAll(t, resp.Body)
	var s metav1.Status
	negotiator := runtime.NewClientNegotiator(serializer.NewCodecFactory(runtime.NewScheme()), schema.GroupVersion{})
	decoder, err := negotiator.Decoder(resp.Header.Get(httpz.ContentTypeHeader), nil)
	require.NoError(t, err)
	obj, _, err := decoder.Decode(data, nil, &s)
	require.NoError(t, err)
	return *obj.(*metav1.Status)
}

func Test_MergeProxiedResponseHeaders(t *testing.T) {
	tests := []struct {
		name                   string
		outboundHeaders        http.Header
		inboundHeaders         http.Header
		expectedInboundHeaders http.Header
	}{
		{
			name:            "no outbound, no inbound headers -> expect default headers",
			outboundHeaders: http.Header{},
			inboundHeaders:  http.Header{},
			expectedInboundHeaders: http.Header{
				"Via": []string{"test-via"},
			},
		},
		{
			name: "passthrough random outbound header",
			outboundHeaders: http.Header{
				"x-kubernetes-pf-flowschema-uid": []string{"c6536774-bf9c-4a73-8d90-39503e311cd3"},
			},
			inboundHeaders: http.Header{},
			expectedInboundHeaders: http.Header{
				"Via":                            []string{"test-via"},
				"x-kubernetes-pf-flowschema-uid": []string{"c6536774-bf9c-4a73-8d90-39503e311cd3"},
			},
		},
		{
			name: "remove CORS headers from outbound headers",
			outboundHeaders: http.Header{
				"Access-Control-Allow-Origin":      []string{"any"},
				"Access-Control-Allow-Methods":     []string{"any"},
				"Access-Control-Allow-Headers":     []string{"any"},
				"Access-Control-Allow-Credentials": []string{"any"},
				"Access-Control-Max-Age":           []string{"any"},
			},
			inboundHeaders: http.Header{},
			expectedInboundHeaders: http.Header{
				"Via": []string{"test-via"},
			},
		},
		{
			name: "don't overwrite inbound with outbound headers",
			outboundHeaders: http.Header{
				"Any-Header": []string{"overwrite"},
			},
			inboundHeaders: http.Header{
				"Any-Header": []string{"expected-to-see-this"},
			},
			expectedInboundHeaders: http.Header{
				"Via":        []string{"test-via"},
				"Any-Header": []string{"expected-to-see-this"},
			},
		},
		{
			name: "proxy Via header is appended to the outbound Via headers",
			outboundHeaders: http.Header{
				"Via": []string{"any-via"},
			},
			inboundHeaders: http.Header{},
			expectedInboundHeaders: http.Header{
				"Via": []string{"any-via", "test-via"},
			},
		},
		{
			name: "Append outbound Vary headers from inbound",
			outboundHeaders: http.Header{
				"Vary": []string{"any-vary"},
			},
			inboundHeaders: http.Header{
				"Vary": []string{"Origin"},
			},
			expectedInboundHeaders: http.Header{
				"Via":  []string{"test-via"},
				"Vary": []string{"Origin", "any-vary"},
			},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			p := kubernetesApiProxy{
				// NOTE: p.serverVia is the only field accessed by the function under test
				serverVia: "test-via",
			}

			p.mergeProxiedResponseHeaders(tc.outboundHeaders, tc.inboundHeaders)

			assert.Equal(t, tc.expectedInboundHeaders, tc.inboundHeaders)
		})
	}
}

func TestGetAuthorizationInfoFromRequest(t *testing.T) {
	testcases := []struct {
		name             string
		givenRequest     *http.Request
		expectedAgentId  int64
		expectedErrorMsg string
	}{
		{
			name: "missing agent id",
			givenRequest: &http.Request{
				URL: &url.URL{},
			},
			expectedAgentId:  0,
			expectedErrorMsg: "exactly one agent id must be provided either in the \"Gitlab-Agent-Id\" header or \"gitlab-agent-id\" query parameter",
		},
		{
			name: "invalid agent id in header",
			givenRequest: &http.Request{
				Header: map[string][]string{
					httpz.GitlabAgentIdHeader: {"foobar"},
				},
			},
			expectedAgentId:  0,
			expectedErrorMsg: "agent id in request: invalid value: \"foobar\"",
		},
		{
			name: "invalid agent id in query param",
			givenRequest: &http.Request{
				URL: &url.URL{
					RawQuery: fmt.Sprintf("%s=foobar", httpz.GitlabAgentIdQueryParam),
				},
			},
			expectedAgentId:  0,
			expectedErrorMsg: "agent id in request: invalid value: \"foobar\"",
		},
		{
			name: "multiple agent ids in headers",
			givenRequest: &http.Request{
				Header: map[string][]string{
					httpz.GitlabAgentIdHeader: {"1", "2"},
				},
			},
			expectedAgentId:  0,
			expectedErrorMsg: fmt.Sprintf("%s: header must have exactly one value", httpz.GitlabAgentIdHeader),
		},
		{
			name: "multiple agent ids in query params",
			givenRequest: &http.Request{
				URL: &url.URL{
					RawQuery: fmt.Sprintf("%[1]s=1&%[1]s=2", httpz.GitlabAgentIdQueryParam),
				},
			},
			expectedAgentId:  0,
			expectedErrorMsg: fmt.Sprintf("%s: header must have exactly one value", httpz.GitlabAgentIdHeader),
		},
		{
			name: "valid agent id in header",
			givenRequest: &http.Request{
				Header: map[string][]string{
					httpz.GitlabAgentIdHeader: {"1"},
				},
			},
			expectedAgentId: 1,
		},
		{
			name: "valid agent id in query param",
			givenRequest: &http.Request{
				URL: &url.URL{
					RawQuery: fmt.Sprintf("%s=1", httpz.GitlabAgentIdQueryParam),
				},
			},
			expectedAgentId: 1,
		},
	}
	for _, tc := range testcases {
		t.Run(tc.name, func(t *testing.T) {
			// WHEN
			actualAgentId, actualErr := getAgentIdForSessionCookieRequest(tc.givenRequest)

			// THEN
			require.Equal(t, tc.expectedAgentId, actualAgentId)
			if tc.expectedAgentId == 0 {
				require.Error(t, actualErr, tc.expectedErrorMsg)
			}
		})
	}
}

func TestGetCsrfTokenForSessionCookieRequest(t *testing.T) {
	testcases := []struct {
		name              string
		givenRequest      *http.Request
		expectedCsrfToken string
		expectedErrorMsg  string
	}{
		{
			name: "missing CSRF token",
			givenRequest: &http.Request{
				URL: &url.URL{},
			},
			expectedCsrfToken: "",
			expectedErrorMsg:  "exactly one CSRF token must be provided either in the \"X-Csrf-Token\" header or \"gitlab-csrf-token\" query parameter",
		},
		{
			name: "multiple CSRF tokens in headers",
			givenRequest: &http.Request{
				Header: map[string][]string{
					httpz.CsrfTokenHeader: {"csrf-token-1", "csrf-token-2"},
				},
			},
			expectedCsrfToken: "",
			expectedErrorMsg:  fmt.Sprintf("%s: header must have exactly one value", httpz.CsrfTokenHeader),
		},
		{
			name: "multiple CSRF tokens in query params",
			givenRequest: &http.Request{
				URL: &url.URL{
					RawQuery: fmt.Sprintf("%[1]s=csrf-token-1&%[1]s=csrf-token-2", httpz.CsrfTokenQueryParam),
				},
			},
			expectedCsrfToken: "",
			expectedErrorMsg:  fmt.Sprintf("%s: header must have exactly one value", httpz.CsrfTokenHeader),
		},
		{
			name: "CSRF token in header",
			givenRequest: &http.Request{
				Header: map[string][]string{
					httpz.CsrfTokenHeader: {"csrf-token"},
				},
			},
			expectedCsrfToken: "csrf-token",
		},
		{
			name: "CSRF token in query param",
			givenRequest: &http.Request{
				URL: &url.URL{
					RawQuery: fmt.Sprintf("%s=csrf-token", httpz.CsrfTokenQueryParam),
				},
			},
			expectedCsrfToken: "csrf-token",
		},
	}
	for _, tc := range testcases {
		t.Run(tc.name, func(t *testing.T) {
			// WHEN
			actualCsrfToken, actualErr := getCsrfTokenForSessionCookieRequest(tc.givenRequest)

			// THEN
			require.Equal(t, tc.expectedCsrfToken, actualCsrfToken)
			if tc.expectedCsrfToken == "" {
				require.Error(t, actualErr, tc.expectedErrorMsg)
			}
		})
	}
}
