package egress

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	corev3 "github.com/envoyproxy/go-control-plane/envoy/config/core/v3"
	extprocfilterv3 "github.com/envoyproxy/go-control-plane/envoy/extensions/filters/http/ext_proc/v3"
	extprocv3 "github.com/envoyproxy/go-control-plane/envoy/service/ext_proc/v3"
	typev3 "github.com/envoyproxy/go-control-plane/envoy/type/v3"
	"github.com/go-logr/logr"
	"golang.org/x/sync/singleflight"
	"google.golang.org/protobuf/types/known/structpb"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/rules"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/scmpath"
)

// ActorIdentityAttribute is the CEL request attribute atenet-egress attaches to additional ext_proc calls: the
// verified actor's spiffe://<td>/worker-for-actor/<atespace>/<name>.
const ActorIdentityAttribute = "filter_state['dev.ate.actor.identity']"

const (
	gitlabResolveTimeout = 1500 * time.Millisecond
	reportTimeout        = 10 * time.Second
	maxListedRepos       = 10
)

// authzServer is devbox-egress-authz, the Envoy ext_proc atenet-egress runs after its own policy (section 4.7). For
// devbox actors it allows a request on an SCM host only when it can be tied to an allowlisted repository, and it
// reports PRs created outside the devbox MCP (section 4.10). Requests from other actors, and requests to hosts that
// aren't SCM hosts, pass untouched.
type authzServer struct {
	extprocv3.UnimplementedExternalProcessorServer

	actors *actorCache
	gitlab *gitlabResolver
	ingest devboxv1.IngestClient
	log    logr.Logger
	now    func() time.Time
	// reported receives every PR report after it is sent; tests use it to wait.
	reported func(*devboxv1.ReportPullRequestRequest, error)
	// onReport lets the MCP's PR registry learn about observed PRs.
	onReport func(info *InstanceInfo, url string)
}

// pendingPR is a PR-creation request waiting for its response headers.
type pendingPR struct {
	info  *InstanceInfo
	actor string
	pc    *scmpath.PullRequestCreate
}

func (s *authzServer) Process(stream extprocv3.ExternalProcessor_ProcessServer) error {
	ctx := stream.Context()
	var pending *pendingPR
	for {
		req, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			return nil
		}
		if err != nil {
			return err
		}

		var resp *extprocv3.ProcessingResponse
		switch r := req.GetRequest().(type) {
		case *extprocv3.ProcessingRequest_RequestHeaders:
			resp, pending = s.onRequestHeaders(ctx, req, r.RequestHeaders)
		case *extprocv3.ProcessingRequest_ResponseHeaders:
			if pending != nil {
				s.onResponseHeaders(pending, r.ResponseHeaders)
				pending = nil
			}
			resp = &extprocv3.ProcessingResponse{Response: &extprocv3.ProcessingResponse_ResponseHeaders{
				ResponseHeaders: &extprocv3.HeadersResponse{},
			}}
		case *extprocv3.ProcessingRequest_RequestBody:
			resp = &extprocv3.ProcessingResponse{Response: &extprocv3.ProcessingResponse_RequestBody{RequestBody: &extprocv3.BodyResponse{}}}
		case *extprocv3.ProcessingRequest_ResponseBody:
			resp = &extprocv3.ProcessingResponse{Response: &extprocv3.ProcessingResponse_ResponseBody{ResponseBody: &extprocv3.BodyResponse{}}}
		case *extprocv3.ProcessingRequest_RequestTrailers:
			resp = &extprocv3.ProcessingResponse{Response: &extprocv3.ProcessingResponse_RequestTrailers{RequestTrailers: &extprocv3.TrailersResponse{}}}
		case *extprocv3.ProcessingRequest_ResponseTrailers:
			resp = &extprocv3.ProcessingResponse{Response: &extprocv3.ProcessingResponse_ResponseTrailers{ResponseTrailers: &extprocv3.TrailersResponse{}}}
		default:
			continue
		}
		if err := stream.Send(resp); err != nil {
			return err
		}
	}
}

func continueRequest() *extprocv3.ProcessingResponse {
	return &extprocv3.ProcessingResponse{Response: &extprocv3.ProcessingResponse_RequestHeaders{
		RequestHeaders: &extprocv3.HeadersResponse{},
	}}
}

func immediate(code typev3.StatusCode, msg string) *extprocv3.ProcessingResponse {
	return &extprocv3.ProcessingResponse{Response: &extprocv3.ProcessingResponse_ImmediateResponse{
		ImmediateResponse: &extprocv3.ImmediateResponse{
			Status: &typev3.HttpStatus{Code: code},
			Headers: &extprocv3.HeaderMutation{SetHeaders: []*corev3.HeaderValueOption{{
				Header: &corev3.HeaderValue{Key: "content-type", RawValue: []byte("text/plain; charset=utf-8")},
			}}},
			Body:    []byte("devbox egress: " + msg + "\n"),
			Details: "devbox_egress_authz",
		},
	}}
}

func (s *authzServer) onRequestHeaders(ctx context.Context, req *extprocv3.ProcessingRequest, h *extprocv3.HttpHeaders) (*extprocv3.ProcessingResponse, *pendingPR) {
	headers := flattenHeaders(h.GetHeaders())
	identity := attribute(req.GetAttributes(), ActorIdentityAttribute)
	if identity == "" {
		identity = attribute(h.GetAttributes(), ActorIdentityAttribute) //nolint:staticcheck // older Envoys only attach attributes to the headers message
	}
	if identity == "" {
		// Not an actor request (or not one Substrate attributed): not ours to judge.
		return continueRequest(), nil
	}
	actor, err := ActorIDFromSPIFFEID(identity)
	if err != nil {
		return continueRequest(), nil
	}
	info, err := s.actors.resolve(ctx, actor)
	if errors.Is(err, ErrUnknownActor) {
		return continueRequest(), nil
	}
	host := normalizeHost(headers[":authority"])
	if host == "" {
		host = normalizeHost(headers["host"])
	}
	if err != nil {
		// Fail closed for devbox SCM traffic only; we can't tell which it is without the instance, so deny SCM
		// lookalikes and let everything else through.
		if scmpath.ProviderForHost(host, nil) != scmpath.Unknown {
			return immediate(typev3.StatusCode_ServiceUnavailable, "can't resolve this devbox instance right now; retry shortly"), nil
		}
		return continueRequest(), nil
	}

	provider, ok := scmProviderFor(info, host)
	if !ok {
		return continueRequest(), nil
	}
	method, rawPath := headers[":method"], headers[":path"]
	res := scmpath.Parse(provider, host, method, rawPath)
	display := host + stripQuery(rawPath)

	if res.GitLabProjectID != "" {
		path, err := s.gitlab.resolve(ctx, info, host, res.GitLabProjectID)
		if errors.Is(err, errGitLabProjectNotFound) {
			return immediate(typev3.StatusCode_Forbidden, fmt.Sprintf("GitLab project %s isn't visible to this devbox", res.GitLabProjectID)), nil
		}
		if err != nil {
			s.log.Info("couldn't resolve GitLab project ID", "instance", info.InstanceID, "host", host, "project", res.GitLabProjectID, "error", err.Error())
			return immediate(typev3.StatusCode_ServiceUnavailable, fmt.Sprintf("couldn't resolve GitLab project %s to check it against this devbox's allowlist; retry shortly", res.GitLabProjectID)), nil
		}
		res.Repos = []string{strings.ToLower(host + "/" + path)}
		if res.PullRequest != nil {
			res.PullRequest.Repo = path
		}
	}

	allowed, all := allowlist(info)
	switch {
	case all:
	case res.Safe:
	case !res.Attributable():
		s.log.V(1).Info("denied unattributable SCM request", "instance", info.InstanceID, "method", method, "request", display, "reason", res.Reason)
		return immediate(typev3.StatusCode_Forbidden, fmt.Sprintf("%s %s can't be tied to a repository this devbox may use (%s)", method, display, res.Reason)), nil
	case !anyAllowed(res.Repos, allowed):
		s.log.Info("denied request for a repository outside the allowlist", "instance", info.InstanceID, "method", method, "repository", res.Repos[0])
		return immediate(typev3.StatusCode_Forbidden, fmt.Sprintf("repository %s is not on this devbox's allowlist (allowed: %s)", res.Repos[0], listRepos(info.AllowedRepositories))), nil
	}

	if res.PullRequest == nil || info.Golden {
		return continueRequest(), nil
	}
	resp := continueRequest()
	// Ask for this response's headers. Honoured when the filter allows mode overrides; installs that send every
	// response's headers need nothing.
	resp.ModeOverride = &extprocfilterv3.ProcessingMode{ResponseHeaderMode: extprocfilterv3.ProcessingMode_SEND}
	return resp, &pendingPR{info: info, actor: identity, pc: res.PullRequest}
}

func (s *authzServer) onResponseHeaders(p *pendingPR, h *extprocv3.HttpHeaders) {
	headers := flattenHeaders(h.GetHeaders())
	if headers[":status"] != "201" {
		return
	}
	url, number, ok := p.pc.URL(headers["location"])
	if !ok {
		s.log.Info("observed a PR creation without a usable Location header; not reported", "instance", p.info.InstanceID, "repository", p.pc.RepositoryURL())
		return
	}
	report := &devboxv1.ReportPullRequestRequest{
		InstanceId: p.info.InstanceID,
		ActorId:    actorSPIFFEID(p.actor),
		Url:        url,
		Provider:   reportProvider(p.pc.Provider),
		Repository: p.pc.RepositoryURL(),
		Number:     number,
		ObservedAt: timestamppb.New(s.now()),
	}
	if s.onReport != nil {
		s.onReport(p.info, url)
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), reportTimeout)
		defer cancel()
		_, err := s.ingest.ReportPullRequest(ctx, report)
		if err != nil {
			s.log.Error(err, "reporting an observed PR failed", "instance", report.InstanceId, "url", report.Url)
		}
		if s.reported != nil {
			s.reported(report, err)
		}
	}()
}

// scmProviderFor reports whether host is one of the instance's SCM hosts (or a companion), and its provider.
func scmProviderFor(info *InstanceInfo, host string) (scmpath.Provider, bool) {
	canonical := canonicalSCMHost(host)
	for _, h := range info.SCMHosts {
		if canonicalSCMHost(h) != canonical {
			continue
		}
		overrides := map[string]string{}
		for k, v := range info.SCMProviders {
			overrides[normalizeHost(k)] = v
		}
		if p, ok := overrides[canonical]; ok {
			overrides[host] = p
		}
		return scmpath.ProviderForHost(host, overrides), true
	}
	return scmpath.Unknown, false
}

// allowlist returns the normalized allowlist, or all=true when the box doesn't restrict repositories.
func allowlist(info *InstanceInfo) (map[string]bool, bool) {
	if len(info.AllowedRepositories) == 0 {
		return nil, true
	}
	set := make(map[string]bool, len(info.AllowedRepositories))
	for _, r := range info.AllowedRepositories {
		set[canonicalRepo(scmpath.Normalize(r))] = true
	}
	return set, false
}

func canonicalRepo(id string) string { return rules.CanonicalRepo(id) }

func anyAllowed(repos []string, allowed map[string]bool) bool {
	for _, r := range repos {
		if allowed[canonicalRepo(r)] {
			return true
		}
	}
	return false
}

func listRepos(repos []string) string {
	if len(repos) > maxListedRepos {
		return strings.Join(repos[:maxListedRepos], ", ") + fmt.Sprintf(" and %d more", len(repos)-maxListedRepos)
	}
	return strings.Join(repos, ", ")
}

func reportProvider(p scmpath.Provider) string {
	if p == scmpath.BitbucketDataCenter {
		return string(scmpath.Bitbucket)
	}
	return string(p)
}

// actorSPIFFEID turns the worker-for-actor identity egress attaches into the actor's own SPIFFE ID.
func actorSPIFFEID(id string) string {
	return strings.Replace(id, "/worker-for-actor/", "/actor/", 1)
}

func stripQuery(p string) string {
	if i := strings.IndexAny(p, "?#"); i >= 0 {
		return p[:i]
	}
	return p
}

func flattenHeaders(m *corev3.HeaderMap) map[string]string {
	out := map[string]string{}
	for _, h := range m.GetHeaders() {
		k := strings.ToLower(h.GetKey())
		v := h.GetValue()
		if v == "" && len(h.GetRawValue()) > 0 {
			v = string(h.GetRawValue())
		}
		if existing, ok := out[k]; ok {
			out[k] = existing + "," + v
		} else {
			out[k] = v
		}
	}
	return out
}

func attribute(attrs map[string]*structpb.Struct, name string) string {
	for _, a := range attrs {
		if v, ok := a.GetFields()[name]; ok {
			return v.GetStringValue()
		}
	}
	return ""
}

// gitlabResolver maps GitLab numeric project IDs to paths with the instance's SCM token. IDs never change paths
// in a way that matters for authorization (a renamed project keeps its ID and gets its new path), so answers are
// cached for the life of the process, bounded in size.
type gitlabResolver struct {
	creds   *credentialCache
	client  *http.Client
	baseURL func(host string) string

	mu    sync.Mutex
	paths map[string]string
	group singleflight.Group
}

const maxGitLabPaths = 10000

// errGitLabProjectNotFound means the project doesn't exist or the instance's token can't see it.
var errGitLabProjectNotFound = errors.New("GitLab project not found")

func newGitLabResolver(creds *credentialCache) *gitlabResolver {
	return &gitlabResolver{
		creds:   creds,
		client:  &http.Client{Timeout: gitlabResolveTimeout},
		baseURL: func(host string) string { return "https://" + host },
		paths:   map[string]string{},
	}
}

func (g *gitlabResolver) resolve(ctx context.Context, info *InstanceInfo, host, id string) (string, error) {
	key := host + "/" + id
	g.mu.Lock()
	if p, ok := g.paths[key]; ok {
		g.mu.Unlock()
		return p, nil
	}
	g.mu.Unlock()

	v, err, _ := g.group.Do(key, func() (any, error) {
		ctx, cancel := context.WithTimeout(ctx, gitlabResolveTimeout)
		defer cancel()
		cred, err := g.creds.get(ctx, credKey{instanceID: info.InstanceID, kind: KindSCM, selector: canonicalSCMHost(host)})
		if err != nil {
			return "", err
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, g.baseURL(host)+"/api/v4/projects/"+id, nil)
		if err != nil {
			return "", err
		}
		// GitLab's REST API rejects Basic auth, which is what egress injects for basic credentials.
		token, err := RawSCMToken(cred.cred)
		if err != nil {
			return "", err
		}
		req.Header.Set("Authorization", bearerPrefix+token)
		resp, err := g.client.Do(req)
		if err != nil {
			return "", err
		}
		defer func() { _ = resp.Body.Close() }()
		if resp.StatusCode == http.StatusNotFound {
			return "", errGitLabProjectNotFound
		}
		if resp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("GitLab returned %s", resp.Status)
		}
		var project struct {
			PathWithNamespace string `json:"path_with_namespace"`
		}
		if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&project); err != nil {
			return "", err
		}
		if project.PathWithNamespace == "" {
			return "", errors.New("GitLab returned no project path")
		}
		g.mu.Lock()
		if len(g.paths) >= maxGitLabPaths {
			g.paths = map[string]string{}
		}
		g.paths[key] = project.PathWithNamespace
		g.mu.Unlock()
		return project.PathWithNamespace, nil
	})
	if err != nil {
		return "", err
	}
	return v.(string), nil
}
