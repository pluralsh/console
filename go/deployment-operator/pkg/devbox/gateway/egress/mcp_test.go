package egress

import (
	"bufio"
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	jose "github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"
	"github.com/go-logr/logr"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/scm"
)

const mcpAudience = "http://devbox-gateway.plrl.svc:8080"

// testIssuer is a Substrate-like actor JWT issuer serving OIDC discovery and a JWKS.
type testIssuer struct {
	srv       *httptest.Server
	key       *ecdsa.PrivateKey
	jwksCalls atomic.Int32
}

func newTestIssuer(t *testing.T) *testIssuer {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	iss := &testIssuer{key: key}
	mux := http.NewServeMux()
	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]string{"issuer": iss.srv.URL, "jwks_uri": iss.srv.URL + "/jwks"})
	})
	mux.HandleFunc("/jwks", func(w http.ResponseWriter, _ *http.Request) {
		iss.jwksCalls.Add(1)
		_ = json.NewEncoder(w).Encode(jose.JSONWebKeySet{Keys: []jose.JSONWebKey{{Key: &key.PublicKey, KeyID: "k1", Algorithm: "ES256", Use: "sig"}}})
	})
	iss.srv = httptest.NewServer(mux)
	t.Cleanup(iss.srv.Close)
	return iss
}

type tokenOpts struct {
	sub      string
	aud      string
	issuer   string
	expiry   time.Duration
	key      *ecdsa.PrivateKey
	kid      string
	atespace string
	name     string
}

func (iss *testIssuer) token(t *testing.T, o tokenOpts) string {
	t.Helper()
	if o.aud == "" {
		o.aud = mcpAudience
	}
	if o.issuer == "" {
		o.issuer = iss.srv.URL
	}
	if o.expiry == 0 {
		o.expiry = 10 * time.Minute
	}
	if o.key == nil {
		o.key = iss.key
	}
	if o.kid == "" {
		o.kid = "k1"
	}
	signer, err := jose.NewSigner(jose.SigningKey{Algorithm: jose.ES256, Key: o.key},
		(&jose.SignerOptions{}).WithType("JWT").WithHeader("kid", o.kid))
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now()
	claims := jwt.Claims{
		Issuer:   o.issuer,
		Subject:  o.sub,
		Audience: jwt.Audience{o.aud},
		IssuedAt: jwt.NewNumericDate(now),
		Expiry:   jwt.NewNumericDate(now.Add(o.expiry)),
	}
	actor := map[string]any{}
	if o.atespace != "" {
		actor = map[string]any{"actor.ate.dev": map[string]string{"atespace": o.atespace, "actorName": o.name, "actorUID": "uid"}}
	}
	raw, err := jwt.Signed(signer).Claims(claims).Claims(actor).Serialize()
	if err != nil {
		t.Fatal(err)
	}
	return raw
}

// The gateway mounts the MCP on its own port: New builds the handler from the issuer alone and Run opens no MCP
// listener.
func TestMCPHandlerWithoutListener(t *testing.T) {
	iss := newTestIssuer(t)
	deps := Deps{Ingest: &fakeIngest{}, Actors: &fakeResolver{}}
	gw := GatewayEndpoint{Host: "devbox-gateway.plrl.svc", Port: DefaultMCPPort}
	if gw.JWTAudience() != mcpAudience {
		t.Fatalf("audience %q, want %q", gw.JWTAudience(), mcpAudience)
	}
	svc, err := New(Config{Gateway: gw, ActorJWTIssuer: iss.srv.URL}, deps)
	if err != nil {
		t.Fatal(err)
	}
	h := svc.MCPHandler()
	if h == nil {
		t.Fatal("MCPHandler is nil with ActorJWTIssuer set")
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, MCPPath, strings.NewReader("{}")))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated MCP call: %d, want 401", rec.Code)
	}

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- svc.Run(ctx) }()
	cancel()
	if err := <-done; err != nil {
		t.Fatalf("Run with no listeners: %v", err)
	}

	if _, err := New(Config{Gateway: gw, MCPAddr: DefaultMCPAddr}, deps); err == nil {
		t.Fatal("MCPAddr without ActorJWTIssuer should fail")
	}
	if svc, err := New(Config{}, deps); err != nil || svc.MCPHandler() != nil {
		t.Fatalf("no issuer: want no MCP, got %v %v", svc.MCPHandler(), err)
	}
}

type fakeSCM struct {
	token string
}

func (f *fakeSCM) GetPRDetails(_ context.Context, prURL string) (*scm.PRDetails, error) {
	return &scm.PRDetails{Title: "PR " + prURL, HeadRef: "feat/x", State: scm.PRStateOpen}, nil
}
func (f *fakeSCM) GetPRSummary(ctx context.Context, prURL string) (*scm.PRDetails, error) {
	return f.GetPRDetails(ctx, prURL)
}
func (f *fakeSCM) GetCILogs(context.Context, string, int64) (string, error) { return "logs", nil }
func (f *fakeSCM) ReactToComment(context.Context, string, string, scm.CommentReactState) error {
	return nil
}

type mcpFixture struct {
	srv     *httptest.Server
	issuer  *testIssuer
	ingest  *fakeIngest
	mcp     *mcpServer
	scmToks []string
}

type fakeOwner map[string]string

func (o fakeOwner) DevboxForPullRequest(_ context.Context, url string) (string, error) {
	return o[url], nil
}

func newMCPFixture(t *testing.T, owner PullRequestOwner) *mcpFixture {
	t.Helper()
	iss := newTestIssuer(t)
	v, err := newActorVerifier(iss.srv.URL, mcpAudience, "")
	if err != nil {
		t.Fatal(err)
	}
	allow := []string{"https://github.com/pluralsh/console", "github.com/pluralsh/deployment-operator"}
	resolver := &fakeResolver{actors: map[string]*InstanceInfo{
		"devboxes/box-1-i1": {
			InstanceID: "i1", BoxID: "box-1", SCMHosts: []string{"github.com"}, AllowedRepositories: allow,
			Checkouts: []*devboxv1.Checkout{{Path: "/workspace/console", Name: "console", RemoteUrl: "git@github.com:pluralsh/console.git", DefaultBranch: "master"}},
		},
		"devboxes/box-2-i2": {InstanceID: "i2", BoxID: "box-2", SCMHosts: []string{"github.com"}, AllowedRepositories: allow},
	}}
	ingest := &fakeIngest{creds: tokenCreds(time.Now, time.Hour)}
	f := &mcpFixture{issuer: iss, ingest: ingest}
	f.mcp = newMCPServer(&mcpServer{
		verifier: v,
		actors:   newActorCache(resolver, time.Minute),
		ingest:   ingest,
		creds:    newCredentialCache(ingest, logr.Discard()),
		prs:      newPRRegistry(),
		owner:    owner,
		log:      logr.Discard(),
		scmClient: func(token string) scm.Client {
			f.scmToks = append(f.scmToks, token)
			return &fakeSCM{token: token}
		},
	})
	f.srv = httptest.NewServer(f.mcp.handler)
	t.Cleanup(f.srv.Close)
	return f
}

func (f *mcpFixture) box1Token(t *testing.T) string {
	return f.issuer.token(t, tokenOpts{sub: "actor/devboxes/box-1-i1", atespace: "devboxes", name: "box-1-i1"})
}

func (f *mcpFixture) box2Token(t *testing.T) string {
	return f.issuer.token(t, tokenOpts{sub: "actor/devboxes/box-2-i2"})
}

type toolResult struct {
	IsError bool `json:"isError"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
}

func (r toolResult) text() string {
	var sb strings.Builder
	for _, c := range r.Content {
		sb.WriteString(c.Text)
	}
	return sb.String()
}

// post sends one JSON-RPC request and returns the HTTP status and, for 200s, the decoded result.
func (f *mcpFixture) post(t *testing.T, token, thread string, body map[string]any) (int, json.RawMessage) {
	t.Helper()
	raw, _ := json.Marshal(body)
	req, _ := http.NewRequest(http.MethodPost, f.srv.URL+MCPPath, bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if thread != "" {
		req.Header.Set(devboxv1.ThreadHeader, thread)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return resp.StatusCode, nil
	}
	if strings.HasPrefix(resp.Header.Get("Content-Type"), "text/event-stream") {
		sc := bufio.NewScanner(bytes.NewReader(data))
		for sc.Scan() {
			if line, ok := strings.CutPrefix(sc.Text(), "data: "); ok {
				data = []byte(line)
			}
		}
	}
	var rpc struct {
		Result json.RawMessage `json:"result"`
		Error  *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(data, &rpc); err != nil {
		t.Fatalf("decoding %q: %v", data, err)
	}
	if rpc.Error != nil {
		t.Fatalf("JSON-RPC error: %s", rpc.Error.Message)
	}
	return resp.StatusCode, rpc.Result
}

func (f *mcpFixture) call(t *testing.T, token, thread, tool string, args map[string]any, meta map[string]any) toolResult {
	t.Helper()
	params := map[string]any{"name": tool, "arguments": args}
	if meta != nil {
		params["_meta"] = meta
	}
	code, raw := f.post(t, token, thread, map[string]any{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": params})
	if code != http.StatusOK {
		t.Fatalf("%s: HTTP %d", tool, code)
	}
	var res toolResult
	if err := json.Unmarshal(raw, &res); err != nil {
		t.Fatal(err)
	}
	return res
}

func TestMCPAuthentication(t *testing.T) {
	f := newMCPFixture(t, nil)
	otherKey, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	list := map[string]any{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}

	cases := []struct {
		name  string
		token string
		code  int
	}{
		{"valid", f.box1Token(t), http.StatusOK},
		{"missing", "", http.StatusUnauthorized},
		{"garbage", "not-a-jwt", http.StatusUnauthorized},
		{"wrong key", f.issuer.token(t, tokenOpts{sub: "actor/devboxes/box-1-i1", key: otherKey}), http.StatusUnauthorized},
		{"unknown kid", f.issuer.token(t, tokenOpts{sub: "actor/devboxes/box-1-i1", key: otherKey, kid: "k2"}), http.StatusUnauthorized},
		{"wrong audience", f.issuer.token(t, tokenOpts{sub: "actor/devboxes/box-1-i1", aud: "https://console.example.com"}), http.StatusUnauthorized},
		{"wrong issuer", f.issuer.token(t, tokenOpts{sub: "actor/devboxes/box-1-i1", issuer: "https://evil.example.com"}), http.StatusUnauthorized},
		{"expired", f.issuer.token(t, tokenOpts{sub: "actor/devboxes/box-1-i1", expiry: -time.Hour}), http.StatusUnauthorized},
		{"worker token", f.issuer.token(t, tokenOpts{sub: "worker-for-actor/devboxes/box-1-i1"}), http.StatusUnauthorized},
		{"claim mismatch", f.issuer.token(t, tokenOpts{sub: "actor/devboxes/box-1-i1", atespace: "devboxes", name: "box-2-i2"}), http.StatusUnauthorized},
		{"not a devbox", f.issuer.token(t, tokenOpts{sub: "actor/other/agent"}), http.StatusForbidden},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if code, _ := f.post(t, tc.token, "", list); code != tc.code {
				t.Fatalf("HTTP %d, want %d", code, tc.code)
			}
		})
	}
	if n := f.issuer.jwksCalls.Load(); n > 2 {
		t.Fatalf("JWKS should be cached and unknown-kid refetches rate limited, got %d fetches", n)
	}
}

func TestMCPListsTools(t *testing.T) {
	f := newMCPFixture(t, nil)
	_, raw := f.post(t, f.box1Token(t), "", map[string]any{"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
	var res struct {
		Tools []struct {
			Name string `json:"name"`
		} `json:"tools"`
	}
	if err := json.Unmarshal(raw, &res); err != nil {
		t.Fatal(err)
	}
	got := map[string]bool{}
	for _, tl := range res.Tools {
		got[tl.Name] = true
	}
	for _, want := range []string{CreatePullRequestTool, CreateLinkedPullRequestTool, ListPullRequestsTool, "getPRState", "getCILogs", "reactToComment"} {
		if !got[want] {
			t.Errorf("tool %s missing from %v", want, got)
		}
	}
}

func TestMCPCreatePullRequestAttribution(t *testing.T) {
	f := newMCPFixture(t, nil)
	res := f.call(t, f.box1Token(t), "thread-7", CreatePullRequestTool, map[string]any{
		"repository": "/workspace/console", "title": "Fix", "body": "Body", "head": "feat/fix", "changeType": "APPLICATION", "labels": []string{"devbox"},
	}, map[string]any{"claudecode/toolUseId": "toolu_1"})
	if res.IsError {
		t.Fatalf("create failed: %s", res.text())
	}
	if len(f.ingest.prs) != 1 {
		t.Fatalf("want one DevboxPullRequest call, got %d", len(f.ingest.prs))
	}
	got := f.ingest.prs[0]
	a := got.GetAttributes()
	if got.GetInstanceId() != "i1" || got.GetThreadId() != "thread-7" || got.GetToolCallId() != "toolu_1" ||
		a.GetRepository() != "https://github.com/pluralsh/console" || a.GetBaseBranch() != "master" ||
		a.GetHeadBranch() != "feat/fix" || a.GetTitle() != "Fix" || len(a.GetLabels()) != 1 {
		t.Fatalf("unexpected DevboxPullRequest %+v", got)
	}
	if !strings.Contains(res.text(), "https://github.com/pluralsh/console/pull/1") {
		t.Fatalf("result should carry the PR URL: %s", res.text())
	}
}

func TestMCPCreatePullRequestRejections(t *testing.T) {
	f := newMCPFixture(t, nil)
	cases := map[string]map[string]any{
		"off allowlist":       {"repository": "https://github.com/pluralsh/secret", "title": "t", "body": "b", "head": "h", "changeType": "APPLICATION"},
		"not an SCM host":     {"repository": "https://gitlab.com/pluralsh/console", "title": "t", "body": "b", "head": "h", "changeType": "APPLICATION"},
		"not a repository":    {"repository": "scratch", "title": "t", "body": "b", "head": "h", "changeType": "APPLICATION"},
		"missing head":        {"repository": "https://github.com/pluralsh/console", "title": "t", "body": "b"},
		"unknown checkout":    {"repository": "/workspace/other", "title": "t", "body": "b", "head": "h", "changeType": "APPLICATION"},
		"allowlist lookalike": {"repository": "https://github.com/pluralsh/console-fork", "title": "t", "body": "b", "head": "h", "changeType": "APPLICATION"},
	}
	for name, args := range cases {
		t.Run(name, func(t *testing.T) {
			if res := f.call(t, f.box1Token(t), "thread-1", CreatePullRequestTool, args, nil); !res.IsError {
				t.Fatalf("want a tool error, got %s", res.text())
			}
		})
	}
	if len(f.ingest.prs) != 0 {
		t.Fatalf("rejected requests must not reach console: %+v", f.ingest.prs)
	}
}

func TestMCPLinkedPullRequests(t *testing.T) {
	f := newMCPFixture(t, nil)
	res := f.call(t, f.box1Token(t), "thread-1", CreateLinkedPullRequestTool, map[string]any{
		"pullRequests": []map[string]any{
			{"repository": "console", "title": "A", "body": "a", "head": "feat/x", "changeType": "APPLICATION"},
			{"repository": "https://github.com/pluralsh/deployment-operator.git", "title": "B", "body": "b", "head": "feat/x", "changeType": "APPLICATION", "base": "main"},
		},
	}, nil)
	if res.IsError {
		t.Fatalf("linked create failed: %s", res.text())
	}
	if len(f.ingest.prs) != 2 {
		t.Fatalf("want two PRs, got %d", len(f.ingest.prs))
	}
	first, second := f.ingest.prs[0].GetAttributes(), f.ingest.prs[1].GetAttributes()
	if len(first.GetRelatedUrls()) != 0 || len(second.GetRelatedUrls()) != 1 ||
		second.GetRelatedUrls()[0] != "https://github.com/pluralsh/console/pull/1" || second.GetBaseBranch() != "main" {
		t.Fatalf("PRs not linked: %+v / %+v", first, second)
	}

	list := f.call(t, f.box1Token(t), "", ListPullRequestsTool, map[string]any{}, nil)
	if !strings.Contains(list.text(), "pluralsh/console/pull/1") || !strings.Contains(list.text(), "pluralsh/deployment-operator/pull/2") {
		t.Fatalf("list_pull_requests missing PRs: %s", list.text())
	}
	if other := f.call(t, f.box2Token(t), "", ListPullRequestsTool, map[string]any{}, nil); strings.Contains(other.text(), "/pull/") {
		t.Fatalf("another box must not see these PRs: %s", other.text())
	}
}

func TestMCPLinkedPullRequestsPartialFailure(t *testing.T) {
	f := newMCPFixture(t, nil)
	res := f.call(t, f.box1Token(t), "thread-1", CreateLinkedPullRequestTool, map[string]any{
		"pullRequests": []map[string]any{
			{"repository": "console", "title": "A", "body": "a", "head": "feat/x", "changeType": "APPLICATION"},
			{"repository": "https://github.com/pluralsh/secret", "title": "B", "body": "b", "head": "feat/x", "changeType": "APPLICATION"},
		},
	}, nil)
	if !res.IsError || len(f.ingest.prs) != 1 || !strings.Contains(res.text(), "allowlist") {
		t.Fatalf("want partial failure, got %v %s", res.IsError, res.text())
	}
}

func TestMCPSCMClientGetsRawTokenFromBasicCredential(t *testing.T) {
	f := newMCPFixture(t, nil)
	f.ingest.setCreds(basicSCMCreds("x-access-token", tokenCreds(time.Now, time.Hour)))
	if res := f.call(t, f.box1Token(t), "", CreatePullRequestTool, map[string]any{
		"repository": "console", "title": "t", "body": "b", "head": "box1", "changeType": "APPLICATION",
	}, nil); res.IsError {
		t.Fatal(res.text())
	}
	res := f.call(t, f.box1Token(t), "", "getPRState", map[string]any{"prUrl": "https://github.com/pluralsh/console/pull/1", "sideload": false}, nil)
	if res.IsError {
		t.Fatal(res.text())
	}
	if len(f.scmToks) != 1 || !strings.HasPrefix(f.scmToks[0], "tok-CREDENTIAL_KIND_SCM-") {
		t.Fatalf("SCM client must get the decoded raw token, got %q", f.scmToks)
	}
}

func TestMCPPullRequestToolsAreScopedToTheCallersBox(t *testing.T) {
	f := newMCPFixture(t, fakeOwner{"https://github.com/pluralsh/console/pull/99": "box-1"})

	// box-2 opens a PR; box-1 opens another.
	if res := f.call(t, f.box2Token(t), "", CreatePullRequestTool, map[string]any{
		"repository": "https://github.com/pluralsh/console", "title": "t", "body": "b", "head": "box2", "changeType": "APPLICATION",
	}, nil); res.IsError {
		t.Fatal(res.text())
	}
	if res := f.call(t, f.box1Token(t), "", CreatePullRequestTool, map[string]any{
		"repository": "console", "title": "t", "body": "b", "head": "box1", "changeType": "APPLICATION",
	}, nil); res.IsError {
		t.Fatal(res.text())
	}
	box2PR, box1PR := "https://github.com/pluralsh/console/pull/1", "https://github.com/pluralsh/console/pull/2"

	cases := []struct {
		name  string
		url   string
		error string
	}{
		{"own PR", box1PR, ""},
		{"own PR known to console", "https://github.com/pluralsh/console/pull/99", ""},
		{"another box's PR", box2PR, "belongs to another devbox"},
		{"unknown PR", "https://github.com/pluralsh/console/pull/500", "wasn't opened from this devbox"},
		{"PR off the allowlist", "https://github.com/pluralsh/secret/pull/1", "allowlist"},
		{"PR on another SCM", "https://gitlab.com/pluralsh/console/-/merge_requests/1", "SCM connections"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			res := f.call(t, f.box1Token(t), "", "getPRState", map[string]any{"prUrl": tc.url, "sideload": false}, nil)
			if tc.error == "" {
				if res.IsError || !strings.Contains(res.text(), "feat/x") {
					t.Fatalf("want PR state, got %s", res.text())
				}
				return
			}
			if !res.IsError || !strings.Contains(res.text(), tc.error) {
				t.Fatalf("want error containing %q, got %s", tc.error, res.text())
			}
		})
	}
	for _, tok := range f.scmToks {
		if !strings.HasPrefix(tok, "tok-CREDENTIAL_KIND_SCM-") {
			t.Fatalf("SCM client must use the instance's SCM token, got %q", tok)
		}
	}
	if len(f.scmToks) != 2 {
		t.Fatalf("only authorized calls should reach the SCM, got %d", len(f.scmToks))
	}
}

type fakeDiffs struct {
	reqs []*devboxv1.BranchDiffStatRequest
	err  error
}

func (d *fakeDiffs) GetBranchDiffStat(_ context.Context, req *devboxv1.BranchDiffStatRequest) (*devboxv1.BranchDiffStatResponse, error) {
	d.reqs = append(d.reqs, req)
	if d.err != nil {
		return nil, d.err
	}
	return &devboxv1.BranchDiffStatResponse{Additions: 40, Deletions: 2, Files: 3, BaseSha: "base-sha", HeadSha: "head-sha"}, nil
}

func TestMCPCreatePullRequestCarriesDifficultyAndCommitShas(t *testing.T) {
	f := newMCPFixture(t, nil)
	diffs := &fakeDiffs{}
	f.mcp.diffs = diffs
	res := f.call(t, f.box1Token(t), "thread-7", CreatePullRequestTool, map[string]any{
		"repository": "/workspace/console", "title": "Fix", "body": "Body", "head": "feat/fix", "changeType": "GITOPS",
	}, nil)
	if res.IsError {
		t.Fatalf("create failed: %s", res.text())
	}
	if len(diffs.reqs) != 1 || diffs.reqs[0].GetInstanceId() != "i1" || diffs.reqs[0].GetBase() != "master" || diffs.reqs[0].GetHead() != "feat/fix" {
		t.Fatalf("unexpected diff stat requests %v", diffs.reqs)
	}
	a := f.ingest.prs[0].GetAttributes()
	if a.GetDifficulty().GetChangeType() != "GITOPS" || a.GetDifficulty().GetLines() != 42 {
		t.Fatalf("difficulty = %v", a.GetDifficulty())
	}
	if len(a.GetCommitShas()) != 2 || a.GetCommitShas()[0].GetSha() != "head-sha" || a.GetCommitShas()[1].GetBranch() != "master" {
		t.Fatalf("commit shas = %v", a.GetCommitShas())
	}

	// sizing is best effort: the PR still opens, classified but without lines
	diffs.err = errors.New("daemon unreachable")
	res = f.call(t, f.box1Token(t), "thread-7", CreatePullRequestTool, map[string]any{
		"repository": "/workspace/console", "title": "Fix", "body": "Body", "head": "feat/other", "changeType": "APPLICATION",
	}, nil)
	if res.IsError {
		t.Fatalf("create failed: %s", res.text())
	}
	if a := f.ingest.prs[1].GetAttributes(); a.GetDifficulty().GetChangeType() != "APPLICATION" || a.GetDifficulty().GetLines() != 0 || len(a.GetCommitShas()) != 0 {
		t.Fatalf("unsized attributes = %v", a)
	}

	res = f.call(t, f.box1Token(t), "thread-7", CreatePullRequestTool, map[string]any{
		"repository": "/workspace/console", "title": "Fix", "body": "Body", "head": "feat/x", "changeType": "REFACTOR",
	}, nil)
	if !res.IsError || !strings.Contains(res.text(), "changeType must be one of") {
		t.Fatalf("an unknown changeType should be rejected: %s", res.text())
	}
}
