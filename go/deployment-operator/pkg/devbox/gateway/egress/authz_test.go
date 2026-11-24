package egress

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	corev3 "github.com/envoyproxy/go-control-plane/envoy/config/core/v3"
	extprocfilterv3 "github.com/envoyproxy/go-control-plane/envoy/extensions/filters/http/ext_proc/v3"
	extprocv3 "github.com/envoyproxy/go-control-plane/envoy/service/ext_proc/v3"
	typev3 "github.com/envoyproxy/go-control-plane/envoy/type/v3"
	"github.com/go-logr/logr"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/structpb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// fakeProcStream feeds Process a fixed sequence of messages and records its responses.
type fakeProcStream struct {
	grpc.ServerStream
	ctx  context.Context
	in   []*extprocv3.ProcessingRequest
	out  []*extprocv3.ProcessingResponse
	next int
}

func (s *fakeProcStream) Context() context.Context { return s.ctx }

func (s *fakeProcStream) Recv() (*extprocv3.ProcessingRequest, error) {
	if s.next >= len(s.in) {
		return nil, io.EOF
	}
	s.next++
	return s.in[s.next-1], nil
}

func (s *fakeProcStream) Send(r *extprocv3.ProcessingResponse) error {
	s.out = append(s.out, r)
	return nil
}

const devboxWorker = "spiffe://substrate-actor.local/worker-for-actor/devboxes/box-1-i1"

func requestHeaders(identity, method, authority, path string) *extprocv3.ProcessingRequest {
	req := &extprocv3.ProcessingRequest{Request: &extprocv3.ProcessingRequest_RequestHeaders{
		RequestHeaders: &extprocv3.HttpHeaders{Headers: headerMap(":method", method, ":authority", authority, ":path", path)},
	}}
	if identity != "" {
		req.Attributes = map[string]*structpb.Struct{
			"envoy.filters.http.ext_proc": {Fields: map[string]*structpb.Value{ActorIdentityAttribute: structpb.NewStringValue(identity)}},
		}
	}
	return req
}

func responseHeaders(kv ...string) *extprocv3.ProcessingRequest {
	return &extprocv3.ProcessingRequest{Request: &extprocv3.ProcessingRequest_ResponseHeaders{
		ResponseHeaders: &extprocv3.HttpHeaders{Headers: headerMap(kv...)},
	}}
}

func headerMap(kv ...string) *corev3.HeaderMap {
	m := &corev3.HeaderMap{}
	for i := 0; i+1 < len(kv); i += 2 {
		m.Headers = append(m.Headers, &corev3.HeaderValue{Key: kv[i], RawValue: []byte(kv[i+1])})
	}
	return m
}

type authzFixture struct {
	srv      *authzServer
	ingest   *fakeIngest
	resolver *fakeResolver
	reported chan *devboxv1.ReportPullRequestRequest
}

func newAuthzFixture(t *testing.T, info *InstanceInfo) *authzFixture {
	t.Helper()
	ingest := &fakeIngest{creds: tokenCreds(time.Now, time.Hour)}
	resolver := &fakeResolver{actors: map[string]*InstanceInfo{}}
	if info != nil {
		resolver.actors["devboxes/box-1-i1"] = info
	}
	reported := make(chan *devboxv1.ReportPullRequestRequest, 4)
	creds := newCredentialCache(ingest, logr.Discard())
	srv := &authzServer{
		actors:   newActorCache(resolver, time.Minute),
		gitlab:   newGitLabResolver(creds),
		ingest:   ingest,
		log:      logr.Discard(),
		now:      time.Now,
		reported: func(r *devboxv1.ReportPullRequestRequest, _ error) { reported <- r },
	}
	return &authzFixture{srv: srv, ingest: ingest, resolver: resolver, reported: reported}
}

func (f *authzFixture) process(t *testing.T, msgs ...*extprocv3.ProcessingRequest) []*extprocv3.ProcessingResponse {
	t.Helper()
	s := &fakeProcStream{ctx: context.Background(), in: msgs}
	if err := f.srv.Process(s); err != nil {
		t.Fatalf("Process: %v", err)
	}
	if len(s.out) != len(msgs) {
		t.Fatalf("got %d responses for %d messages", len(s.out), len(msgs))
	}
	return s.out
}

func testInstance() *InstanceInfo {
	return &InstanceInfo{
		InstanceID:          "i1",
		BoxID:               "box-1",
		SCMHosts:            []string{"github.com", "gitlab.example.com"},
		SCMProviders:        map[string]string{"gitlab.example.com": "gitlab"},
		AllowedRepositories: []string{"https://github.com/pluralsh/console.git", "git@gitlab.example.com:team/svc.git"},
	}
}

// verdict is "continue" or the immediate response's status code and body.
func verdict(r *extprocv3.ProcessingResponse) (int, string) {
	if ir := r.GetImmediateResponse(); ir != nil {
		return int(ir.GetStatus().GetCode()), string(ir.GetBody())
	}
	if r.GetRequestHeaders() == nil {
		return -1, "unexpected response type"
	}
	return 0, ""
}

func TestAuthzRequestVerdicts(t *testing.T) {
	cases := []struct {
		name      string
		identity  string
		method    string
		authority string
		path      string
		status    int
		body      string
	}{
		{name: "allowed git fetch", identity: devboxWorker, method: "GET", authority: "github.com", path: "/pluralsh/console.git/info/refs?service=git-upload-pack"},
		{name: "allowed api with port", identity: devboxWorker, method: "GET", authority: "api.github.com:443", path: "/repos/pluralsh/console/commits"},
		{name: "repo off allowlist", identity: devboxWorker, method: "POST", authority: "github.com", path: "/pluralsh/secret/git-receive-pack",
			status: 403, body: "repository github.com/pluralsh/secret is not on this devbox's allowlist (allowed: https://github.com/pluralsh/console.git"},
		{name: "graphql", identity: devboxWorker, method: "POST", authority: "api.github.com", path: "/graphql", status: 403, body: "GraphQL"},
		{name: "search", identity: devboxWorker, method: "GET", authority: "api.github.com", path: "/search/code?q=x", status: 403, body: "search spans repositories"},
		{name: "org wide", identity: devboxWorker, method: "GET", authority: "api.github.com", path: "/orgs/pluralsh/repos", status: 403, body: "can't be tied to a repository"},
		{name: "safe endpoint", identity: devboxWorker, method: "GET", authority: "api.github.com", path: "/rate_limit"},
		{name: "signed storage host", identity: devboxWorker, method: "GET", authority: "objects.githubusercontent.com", path: "/github-production-lfs/abc?X-Amz-Signature=x"},
		{name: "actions log storage host", identity: devboxWorker, method: "GET", authority: "productionresultssa16.blob.core.windows.net", path: "/actions-results/log?sig=x"},
		{name: "non-SCM host", identity: devboxWorker, method: "POST", authority: "pypi.org", path: "/simple/requests/"},
		{name: "gitlab path allowed", identity: devboxWorker, method: "GET", authority: "gitlab.example.com", path: "/team/svc.git/info/refs"},
		{name: "gitlab path denied", identity: devboxWorker, method: "GET", authority: "gitlab.example.com", path: "/team/other.git/info/refs", status: 403},
		{name: "gitlab graphql", identity: devboxWorker, method: "POST", authority: "gitlab.example.com", path: "/api/graphql", status: 403},
		{name: "non-devbox actor", identity: "spiffe://substrate-actor.local/worker-for-actor/other/agent", method: "POST", authority: "api.github.com", path: "/graphql"},
		{name: "no actor identity", method: "POST", authority: "api.github.com", path: "/graphql"},
		{name: "malformed identity", identity: "spiffe://substrate-actor.local/something", method: "POST", authority: "api.github.com", path: "/graphql"},
		{name: "path traversal", identity: devboxWorker, method: "GET", authority: "github.com", path: "/pluralsh/console/../../pluralsh/secret/info/refs", status: 403},
	}
	f := newAuthzFixture(t, testInstance())
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			out := f.process(t, requestHeaders(tc.identity, tc.method, tc.authority, tc.path))
			status, body := verdict(out[0])
			if status != tc.status {
				t.Fatalf("status = %d (%q), want %d", status, body, tc.status)
			}
			if tc.body != "" && !strings.Contains(body, tc.body) {
				t.Fatalf("body %q doesn't contain %q", body, tc.body)
			}
			if status == 403 && !strings.HasPrefix(body, "devbox egress: ") {
				t.Fatalf("403 body should explain itself: %q", body)
			}
		})
	}
}

func TestAuthzEmptyAllowlistAllowsEverything(t *testing.T) {
	info := testInstance()
	info.AllowedRepositories = nil
	f := newAuthzFixture(t, info)
	out := f.process(t, requestHeaders(devboxWorker, "POST", "api.github.com", "/graphql"))
	if status, body := verdict(out[0]); status != 0 {
		t.Fatalf("want continue, got %d %q", status, body)
	}
}

func TestAuthzResolverErrorFailsClosedOnSCMOnly(t *testing.T) {
	f := newAuthzFixture(t, testInstance())
	f.resolver.err = errors.New("core unavailable")
	out := f.process(t,
		requestHeaders(devboxWorker, "GET", "github.com", "/pluralsh/console/info/refs"),
		requestHeaders(devboxWorker, "GET", "pypi.org", "/simple/"),
	)
	if status, _ := verdict(out[0]); status != 503 {
		t.Fatalf("SCM request: want 503, got %d", status)
	}
	if status, _ := verdict(out[1]); status != 0 {
		t.Fatalf("non-SCM request: want continue, got %d", status)
	}
}

func TestAuthzGitLabProjectIDResolution(t *testing.T) {
	var lookups int
	gitlab := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lookups++
		if got := r.Header.Get("Authorization"); !strings.HasPrefix(got, "Bearer tok-CREDENTIAL_KIND_SCM-") {
			t.Errorf("GitLab lookup sent Authorization %q", got)
		}
		switch r.URL.Path {
		case "/api/v4/projects/42":
			_, _ = io.WriteString(w, `{"id":42,"path_with_namespace":"team/svc"}`)
		case "/api/v4/projects/43":
			_, _ = io.WriteString(w, `{"id":43,"path_with_namespace":"team/other"}`)
		default:
			http.NotFound(w, r)
		}
	}))
	defer gitlab.Close()

	f := newAuthzFixture(t, testInstance())
	f.srv.gitlab.baseURL = func(string) string { return gitlab.URL }

	out := f.process(t,
		requestHeaders(devboxWorker, "GET", "gitlab.example.com", "/api/v4/projects/42/repository/tree"),
		requestHeaders(devboxWorker, "GET", "gitlab.example.com", "/api/v4/projects/42/repository/files/a"),
		requestHeaders(devboxWorker, "GET", "gitlab.example.com", "/api/v4/projects/43/repository/tree"),
		requestHeaders(devboxWorker, "GET", "gitlab.example.com", "/api/v4/projects/99/repository/tree"),
	)
	want := []int{0, 0, 403, 403}
	for i, w := range want {
		if status, body := verdict(out[i]); status != w {
			t.Errorf("request %d: status %d (%q), want %d", i, status, body, w)
		}
	}
	if lookups != 3 {
		t.Errorf("project 42 should be resolved once and cached; got %d lookups", lookups)
	}
}

func TestAuthzGitLabProjectIDResolutionWithBasicCredential(t *testing.T) {
	var auth string
	gitlab := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth = r.Header.Get("Authorization")
		_, _ = io.WriteString(w, `{"id":42,"path_with_namespace":"team/svc"}`)
	}))
	defer gitlab.Close()

	f := newAuthzFixture(t, testInstance())
	f.ingest.setCreds(basicSCMCreds("oauth2", tokenCreds(time.Now, time.Hour)))
	f.srv.gitlab.baseURL = func(string) string { return gitlab.URL }

	out := f.process(t, requestHeaders(devboxWorker, "GET", "gitlab.example.com", "/api/v4/projects/42/repository/tree"))
	if status, body := verdict(out[0]); status != 0 {
		t.Fatalf("status %d (%q), want continue", status, body)
	}
	if !strings.HasPrefix(auth, "Bearer tok-CREDENTIAL_KIND_SCM-") {
		t.Fatalf("GitLab REST needs the raw token as a bearer, got Authorization %q", auth)
	}
}

func TestAuthzObservesPullRequestCreation(t *testing.T) {
	f := newAuthzFixture(t, testInstance())
	var observed string
	f.srv.onReport = func(_ *InstanceInfo, url string) { observed = url }

	out := f.process(t,
		requestHeaders(devboxWorker, "POST", "api.github.com", "/repos/pluralsh/console/pulls"),
		responseHeaders(":status", "201", "location", "https://api.github.com/repos/pluralsh/console/pulls/1347"),
	)
	if status, _ := verdict(out[0]); status != 0 {
		t.Fatalf("PR creation should be allowed, got %d", status)
	}
	if mo := out[0].GetModeOverride(); mo.GetResponseHeaderMode() != extprocfilterv3.ProcessingMode_SEND {
		t.Fatalf("PR creation should ask for response headers, got %+v", mo)
	}
	if out[1].GetResponseHeaders() == nil {
		t.Fatalf("response headers must be answered with a HeadersResponse, got %+v", out[1])
	}

	select {
	case r := <-f.reported:
		if r.GetInstanceId() != "i1" || r.GetUrl() != "https://github.com/pluralsh/console/pull/1347" || r.GetNumber() != 1347 ||
			r.GetProvider() != "github" || r.GetRepository() != "https://github.com/pluralsh/console" ||
			r.GetActorId() != "spiffe://substrate-actor.local/actor/devboxes/box-1-i1" || r.GetObservedAt() == nil {
			t.Fatalf("unexpected report %+v", r)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("PR creation was not reported")
	}
	if observed != "https://github.com/pluralsh/console/pull/1347" {
		t.Fatalf("onReport got %q", observed)
	}
}

func TestAuthzIgnoresFailedPullRequestCreation(t *testing.T) {
	f := newAuthzFixture(t, testInstance())
	f.process(t,
		requestHeaders(devboxWorker, "POST", "api.github.com", "/repos/pluralsh/console/pulls"),
		responseHeaders(":status", "422"),
		// a later request on the same stream isn't a PR creation
		requestHeaders(devboxWorker, "GET", "api.github.com", "/repos/pluralsh/console"),
		responseHeaders(":status", "201", "location", "https://api.github.com/repos/pluralsh/console/pulls/9"),
	)
	select {
	case r := <-f.reported:
		t.Fatalf("unexpected report %+v", r)
	case <-time.After(100 * time.Millisecond):
	}
}

func TestAuthzDeniedPullRequestIsNotObserved(t *testing.T) {
	f := newAuthzFixture(t, testInstance())
	out := f.process(t, requestHeaders(devboxWorker, "POST", "api.github.com", "/repos/pluralsh/secret/pulls"))
	if status, _ := verdict(out[0]); status != int(typev3.StatusCode_Forbidden) {
		t.Fatalf("want 403, got %d", status)
	}
}
