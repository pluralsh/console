package egress

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/go-logr/logr"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/deployment-operator/internal/mcpserver/agent/tool"
	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/scmpath"
	"github.com/pluralsh/console/go/deployment-operator/pkg/scm"
)

// MCPPath is where the devbox MCP serves streamable HTTP. The daemon's per-thread MCP entry points at
// GatewayEndpoint.URL() + MCPPath, with an X-Devbox-Thread header and an Authorization placeholder egress replaces
// with the actor JWT.
const MCPPath = "/mcp"

const (
	CreatePullRequestTool       = "create_pull_request"
	CreateLinkedPullRequestTool = "create_linked_pull_requests"
	ListPullRequestsTool        = "list_pull_requests"
)

// Caller is the authenticated sandbox behind a devbox MCP request.
type Caller struct {
	ActorID  string
	Instance *InstanceInfo
	// ThreadID is the console thread from the X-Devbox-Thread header; empty for imported sessions.
	ThreadID string
}

type callerKey struct{}

// CallerFromContext returns the caller the devbox MCP authenticated, if any.
func CallerFromContext(ctx context.Context) (*Caller, bool) {
	c, ok := ctx.Value(callerKey{}).(*Caller)
	return c, ok && c != nil
}

// WithCaller attaches a caller to a context. The core's actor-JWT-authenticated services can share it.
func WithCaller(ctx context.Context, c *Caller) context.Context {
	return context.WithValue(ctx, callerKey{}, c)
}

// mcpServer serves the PR tools of agent-mcpserver multi-tenant. Branches and commits are made by the agent with git
// inside the sandbox, through egress and its allowlist; the MCP handles what needs credentials or console:
// creating PRs (through console, for attribution), and reading PR state, CI logs and reacting to comments with the
// instance's SCM token.
type mcpServer struct {
	verifier *actorVerifier
	actors   *actorCache
	ingest   devboxv1.IngestClient
	creds    *credentialCache
	prs      *prRegistry
	diffs    BranchDiffs
	scmOpts  []scm.ClientOption
	log      logr.Logger
	// scmClient builds the client for a token; tests replace it.
	scmClient func(token string) scm.Client

	handler http.Handler
}

func newMCPServer(m *mcpServer) *mcpServer {
	if m.scmClient == nil {
		m.scmClient = func(token string) scm.Client { return scm.NewClient(token, m.scmOpts...) }
	}
	s := server.NewMCPServer("Plural Devbox MCP Server", "0.0.0-dev", server.WithToolCapabilities(true))
	m.installPullRequestTools(s)

	scmProvider := func() scm.Client { return tenantSCM{m: m} }
	for _, t := range []tool.Tool{tool.NewGetPRState(scmProvider), tool.NewGetCILogs(scmProvider), tool.NewReactToComment(scmProvider)} {
		t.Install(s)
	}

	mux := http.NewServeMux()
	mux.Handle(MCPPath, m.authenticate(server.NewStreamableHTTPServer(s, server.WithStateLess(true))))
	m.handler = mux
	return m
}

// authenticate verifies the actor JWT egress injected and attaches the caller. Requests that didn't come through
// egress carry no valid JWT and get a 401.
func (m *mcpServer) authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, ok := bearerToken(r.Header.Get("Authorization"))
		if !ok {
			http.Error(w, "devbox mcp: an actor JWT is required", http.StatusUnauthorized)
			return
		}
		actor, err := m.verifier.verify(r.Context(), raw)
		if err != nil {
			m.log.V(1).Info("rejected devbox mcp caller", "error", err.Error())
			http.Error(w, "devbox mcp: invalid actor JWT", http.StatusUnauthorized)
			return
		}
		info, err := m.actors.resolve(r.Context(), actor)
		switch {
		case errors.Is(err, ErrUnknownActor), err == nil && info.Golden:
			http.Error(w, "devbox mcp: caller is not a devbox instance", http.StatusForbidden)
			return
		case err != nil:
			http.Error(w, "devbox mcp: couldn't resolve the calling instance; retry shortly", http.StatusServiceUnavailable)
			return
		}
		caller := &Caller{ActorID: actor, Instance: info, ThreadID: strings.TrimSpace(r.Header.Get(devboxv1.ThreadHeader))}
		next.ServeHTTP(w, r.WithContext(WithCaller(r.Context(), caller)))
	})
}

func bearerToken(h string) (string, bool) {
	scheme, token, ok := strings.Cut(strings.TrimSpace(h), " ")
	if !ok || !strings.EqualFold(scheme, "bearer") || strings.TrimSpace(token) == "" {
		return "", false
	}
	return strings.TrimSpace(token), true
}

// Pull request tools ------------------------------------------------------------------------------------------------

func (m *mcpServer) installPullRequestTools(s *server.MCPServer) {
	prProps := []mcp.ToolOption{
		mcp.WithDescription("Open a pull request for a branch you have already pushed. Console creates it with the box's SCM connection and links it to this thread."),
		mcp.WithString("repository", mcp.Required(),
			mcp.Description("The repository: its remote URL, or the workspace path or directory name of its checkout")),
		mcp.WithString("title", mcp.Required(), mcp.Description("The title of the pull request")),
		mcp.WithString("body", mcp.Required(), mcp.Description("The body/description of the pull request")),
		mcp.WithString("head", mcp.Required(), mcp.Description("The pushed branch with the changes")),
		changeTypeArg(),
		mcp.WithString("base", mcp.Description("The branch to merge into. Defaults to the checkout's default branch.")),
		mcp.WithBoolean("draft", mcp.Description("Open the pull request as a draft")),
		mcp.WithArray("labels", mcp.WithStringItems(), mcp.Description("Labels to apply")),
		mcp.WithArray("relatedUrls", mcp.WithStringItems(), mcp.Description("URLs of related pull requests in other repositories")),
	}
	s.AddTool(mcp.NewTool(CreatePullRequestTool, prProps...), m.createPullRequest)

	s.AddTool(mcp.NewTool(CreateLinkedPullRequestTool,
		mcp.WithDescription("Open one pull request per repository for a change that spans several repositories. Each pull request links to the others."),
		mcp.WithArray("pullRequests", mcp.Required(), mcp.Description("One entry per repository"), mcp.Items(map[string]any{
			"type":     "object",
			"required": []string{"repository", "title", "body", "head", "changeType"},
			"properties": map[string]any{
				"repository": map[string]any{"type": "string", "description": "Remote URL, workspace path or checkout directory name"},
				"title":      map[string]any{"type": "string"},
				"body":       map[string]any{"type": "string"},
				"head":       map[string]any{"type": "string"},
				"changeType": map[string]any{"type": "string", "enum": changeTypes, "description": changeTypeDescription},
				"base":       map[string]any{"type": "string"},
				"draft":      map[string]any{"type": "boolean"},
			},
		})),
	), m.createLinkedPullRequests)

	s.AddTool(mcp.NewTool(ListPullRequestsTool,
		mcp.WithDescription("List the pull requests opened from this devbox instance, across repositories: by these tools, the Create PR button, or observed when you opened them directly."),
	), m.listPullRequests)
}

var changeTypes = []string{
	string(client.PrChangeTypeGitops),
	string(client.PrChangeTypeApplication),
	string(client.PrChangeTypeConfiguration),
}

const changeTypeDescription = "The primary kind of change: GITOPS (deployment manifests and other gitops config), " +
	"APPLICATION (application code) or CONFIGURATION (other configuration)"

func changeTypeArg() mcp.ToolOption {
	return mcp.WithString("changeType", mcp.Required(), mcp.Enum(changeTypes...), mcp.Description(changeTypeDescription))
}

type prInput struct {
	Repository  string
	Title       string
	Body        string
	Head        string
	ChangeType  string
	Base        string
	Draft       bool
	Labels      []string
	RelatedURLs []string
}

type prOutput struct {
	Success        bool   `json:"success"`
	Repository     string `json:"repository"`
	PullRequestID  string `json:"pullRequestId,omitempty"`
	PullRequestURL string `json:"pullRequestUrl,omitempty"`
	Number         int64  `json:"number,omitempty"`
	Error          string `json:"error,omitempty"`
}

func (m *mcpServer) createPullRequest(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	in := prInput{
		Repository:  req.GetString("repository", ""),
		Title:       req.GetString("title", ""),
		Body:        req.GetString("body", ""),
		Head:        req.GetString("head", ""),
		ChangeType:  req.GetString("changeType", ""),
		Base:        req.GetString("base", ""),
		Draft:       req.GetBool("draft", false),
		Labels:      req.GetStringSlice("labels", nil),
		RelatedURLs: req.GetStringSlice("relatedUrls", nil),
	}
	out, err := m.openPullRequest(ctx, in, toolCallID(req))
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultJSON(out)
}

func (m *mcpServer) createLinkedPullRequests(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	raw, ok := req.GetArguments()["pullRequests"].([]any)
	if !ok || len(raw) == 0 {
		return mcp.NewToolResultError("pullRequests must be a non-empty array"), nil
	}
	inputs := make([]prInput, 0, len(raw))
	for i, r := range raw {
		obj, ok := r.(map[string]any)
		if !ok {
			return mcp.NewToolResultError(fmt.Sprintf("pullRequests[%d] must be an object", i)), nil
		}
		str := func(k string) string { s, _ := obj[k].(string); return s }
		draft, _ := obj["draft"].(bool)
		inputs = append(inputs, prInput{Repository: str("repository"), Title: str("title"), Body: str("body"), Head: str("head"),
			ChangeType: str("changeType"), Base: str("base"), Draft: draft})
	}

	// Each PR links to the ones opened before it; console fills in the reverse links from related_urls.
	results := make([]prOutput, 0, len(inputs))
	var urls []string
	failed := false
	for _, in := range inputs {
		in.RelatedURLs = slices.Clone(urls)
		out, err := m.openPullRequest(ctx, in, toolCallID(req))
		if err != nil {
			failed = true
			results = append(results, prOutput{Repository: in.Repository, Error: err.Error()})
			continue
		}
		urls = append(urls, out.PullRequestURL)
		results = append(results, *out)
	}
	res, err := mcp.NewToolResultJSON(struct {
		Success      bool       `json:"success"`
		PullRequests []prOutput `json:"pullRequests"`
	}{Success: !failed, PullRequests: results})
	if res != nil {
		res.IsError = failed
	}
	return res, err
}

func (m *mcpServer) openPullRequest(ctx context.Context, in prInput, toolCall string) (*prOutput, error) {
	caller, ok := CallerFromContext(ctx)
	if !ok {
		return nil, errors.New("unauthenticated")
	}
	for name, v := range map[string]string{"repository": in.Repository, "title": in.Title, "body": in.Body, "head": in.Head, "changeType": in.ChangeType} {
		if strings.TrimSpace(v) == "" {
			return nil, fmt.Errorf("%s is required", name)
		}
	}
	if !slices.Contains(changeTypes, in.ChangeType) {
		return nil, fmt.Errorf("changeType must be one of %s", strings.Join(changeTypes, ", "))
	}
	remote, checkout := resolveRepository(caller.Instance, in.Repository)
	repo, err := authorizeRepository(caller.Instance, remote)
	if err != nil {
		return nil, err
	}
	base := in.Base
	if base == "" && checkout != nil {
		base = checkout.GetDefaultBranch()
	}

	difficulty, shas := m.sizePullRequest(ctx, caller.Instance, in, repo, checkout, base)
	resp, err := m.ingest.DevboxPullRequest(ctx, &devboxv1.DevboxPullRequestRequest{
		InstanceId: caller.Instance.InstanceID,
		ThreadId:   caller.ThreadID,
		ToolCallId: toolCall,
		Attributes: &devboxv1.PullRequestAttributes{
			Repository:  repo,
			Title:       in.Title,
			Body:        in.Body,
			HeadBranch:  in.Head,
			BaseBranch:  base,
			Draft:       in.Draft,
			Labels:      in.Labels,
			RelatedUrls: in.RelatedURLs,
			Difficulty:  difficulty,
			CommitShas:  shas,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("console couldn't create the pull request: %w", err)
	}
	m.prs.record(caller.Instance, resp.GetUrl(), repo, caller.ThreadID, resp.GetNumber())
	return &prOutput{
		Success:        true,
		Repository:     repo,
		PullRequestID:  resp.GetPullRequestId(),
		PullRequestURL: resp.GetUrl(),
		Number:         resp.GetNumber(),
	}, nil
}

// sizePullRequest counts the branch's changed lines in the instance's checkout, as agent runs do. A failure only
// costs the line count and SHAs, never the pull request.
func (m *mcpServer) sizePullRequest(ctx context.Context, info *InstanceInfo, in prInput, repo string, checkout *devboxv1.Checkout, base string) (*devboxv1.PullRequestDifficulty, []*devboxv1.CommitSha) {
	difficulty := &devboxv1.PullRequestDifficulty{ChangeType: in.ChangeType}
	if m.diffs == nil || base == "" {
		return difficulty, nil
	}
	target := repo
	if checkout != nil && checkout.GetName() != "" {
		target = checkout.GetName()
	}
	st, err := m.diffs.GetBranchDiffStat(ctx, &devboxv1.BranchDiffStatRequest{
		InstanceId: info.InstanceID, Repository: target, Base: base, Head: in.Head,
	})
	if err != nil {
		m.log.Info("couldn't size the pull request's branch", "instance", info.InstanceID, "repository", repo, "error", err.Error())
		return difficulty, nil
	}
	difficulty.Lines = st.GetAdditions() + st.GetDeletions()
	return difficulty, []*devboxv1.CommitSha{
		{Branch: in.Head, Sha: st.GetHeadSha()},
		{Branch: base, Sha: st.GetBaseSha()},
	}
}

func (m *mcpServer) listPullRequests(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	caller, ok := CallerFromContext(ctx)
	if !ok {
		return mcp.NewToolResultError("unauthenticated"), nil
	}
	local := m.prs.forInstance(caller.Instance.InstanceID)
	resp, err := m.ingest.ListDevboxPullRequests(ctx, &devboxv1.ListDevboxPullRequestsRequest{InstanceId: caller.Instance.InstanceID})
	if err != nil {
		m.log.Info("couldn't list the instance's pull requests from console", "instance", caller.Instance.InstanceID, "error", err.Error())
		return mcp.NewToolResultJSON(struct {
			PullRequests []trackedPR `json:"pullRequests"`
			Warning      string      `json:"warning"`
		}{PullRequests: local, Warning: "console is unreachable, so this lists only pull requests this gateway opened recently"})
	}
	return mcp.NewToolResultJSON(struct {
		PullRequests []trackedPR `json:"pullRequests"`
	}{PullRequests: mergePullRequests(caller.Instance, resp.GetPullRequests(), local)})
}

// mergePullRequests is console's records of an instance's PRs, plus any this replica opened that console doesn't
// list yet.
func mergePullRequests(info *InstanceInfo, records []*devboxv1.DevboxPullRequestRecord, local []trackedPR) []trackedPR {
	out := make([]trackedPR, 0, len(records)+len(local))
	seen := map[string]bool{}
	for _, r := range records {
		seen[prKey(r.GetUrl())] = true
		out = append(out, trackedPR{
			URL:        r.GetUrl(),
			Repository: repositoryOf(r.GetUrl()),
			Number:     r.GetNumber(),
			Title:      r.GetTitle(),
			Status:     r.GetStatus(),
			Source:     r.GetSource(),
			ThreadID:   r.GetThreadId(),
			InstanceID: info.InstanceID,
			BoxID:      info.BoxID,
			CreatedAt:  r.GetCreatedAt().AsTime(),
		})
	}
	for _, pr := range local {
		if !seen[prKey(pr.URL)] {
			out = append(out, pr)
		}
	}
	slices.SortFunc(out, func(a, b trackedPR) int { return a.CreatedAt.Compare(b.CreatedAt) })
	return out
}

// repositoryOf is a PR URL's https repository URL: everything before /pull/ (GitHub, Bitbucket) or /-/merge_requests/
// (GitLab), or "" for other shapes.
func repositoryOf(prURL string) string {
	for _, sep := range []string{"/-/merge_requests/", "/pull/", "/pullrequest/", "/pull-requests/"} {
		if repo, _, ok := strings.Cut(prURL, sep); ok {
			return repo
		}
	}
	return ""
}

// toolCallID picks the client's tool call ID out of _meta, when the harness sends one.
func toolCallID(req mcp.CallToolRequest) string {
	if req.Params.Meta == nil {
		return ""
	}
	for _, k := range []string{"toolCallId", "claudecode/toolUseId", "tool_call_id"} {
		if v, ok := req.Params.Meta.AdditionalFields[k].(string); ok {
			return v
		}
	}
	return ""
}

// resolveRepository maps a workspace path or checkout name to its remote; anything else is taken as a remote.
func resolveRepository(info *InstanceInfo, repository string) (string, *devboxv1.Checkout) {
	r := strings.TrimSuffix(strings.TrimSpace(repository), "/")
	for _, c := range info.Checkouts {
		if c.GetRemoteUrl() != "" && (c.GetPath() == r || c.GetName() == r) {
			return c.GetRemoteUrl(), c
		}
	}
	return r, nil
}

// authorizeRepository checks a remote against the instance's SCM hosts and allowlist (the AgentRuntime /
// Devbox allowed_repository? semantics) and returns its normalized https URL.
func authorizeRepository(info *InstanceInfo, remote string) (string, error) {
	id := scmpath.Normalize(remote)
	host, path, ok := strings.Cut(id, "/")
	if !ok || path == "" || host == "" {
		return "", fmt.Errorf("%q isn't a repository remote or checkout of this devbox", remote)
	}
	if _, ok := scmProviderFor(info, host); !ok {
		return "", fmt.Errorf("repository %s isn't on one of this devbox's SCM connections", id)
	}
	allowed, all := allowlist(info)
	if !all && !allowed[canonicalRepo(id)] {
		return "", fmt.Errorf("repository %s is not on this devbox's allowlist (allowed: %s)", id, listRepos(info.AllowedRepositories))
	}
	return "https://" + id, nil
}

// tenantSCM is the scm.Client the reused agent-mcpserver tools call. It authorizes each PR URL against the calling
// instance's box and allowlist, then calls the SCM with that instance's token.
type tenantSCM struct{ m *mcpServer }

func (t tenantSCM) client(ctx context.Context, prURL string) (scm.Client, error) {
	caller, ok := CallerFromContext(ctx)
	if !ok {
		return nil, errors.New("unauthenticated")
	}
	if err := t.m.authorizePR(ctx, caller.Instance, prURL); err != nil {
		return nil, err
	}
	u, _ := url.Parse(prURL)
	cred, err := t.m.creds.get(ctx, credKey{instanceID: caller.Instance.InstanceID, kind: KindSCM, selector: canonicalSCMHost(u.Hostname())})
	if err != nil {
		return nil, fmt.Errorf("SCM credentials unavailable: %w", err)
	}
	token, err := RawSCMToken(cred.cred)
	if err != nil {
		return nil, fmt.Errorf("SCM credentials unusable: %w", err)
	}
	return t.m.scmClient(token), nil
}

func (t tenantSCM) GetPRDetails(ctx context.Context, prURL string) (*scm.PRDetails, error) {
	c, err := t.client(ctx, prURL)
	if err != nil {
		return nil, err
	}
	return c.GetPRDetails(ctx, prURL)
}

func (t tenantSCM) GetPRSummary(ctx context.Context, prURL string) (*scm.PRDetails, error) {
	c, err := t.client(ctx, prURL)
	if err != nil {
		return nil, err
	}
	return c.GetPRSummary(ctx, prURL)
}

func (t tenantSCM) GetCILogs(ctx context.Context, prURL string, checkRunID int64) (string, error) {
	c, err := t.client(ctx, prURL)
	if err != nil {
		return "", err
	}
	return c.GetCILogs(ctx, prURL, checkRunID)
}

func (t tenantSCM) ReactToComment(ctx context.Context, prURL, reactableID string, state scm.CommentReactState) error {
	c, err := t.client(ctx, prURL)
	if err != nil {
		return err
	}
	return c.ReactToComment(ctx, prURL, reactableID, state)
}

// authorizePR allows PR tools only on PRs of the caller's box, in allowlisted repositories.
func (m *mcpServer) authorizePR(ctx context.Context, info *InstanceInfo, prURL string) error {
	u, err := url.Parse(strings.TrimSpace(prURL))
	if err != nil || u.Host == "" || (u.Scheme != "https" && u.Scheme != "http") {
		return fmt.Errorf("%q isn't a pull request URL", prURL)
	}
	host := normalizeHost(u.Host)
	provider, ok := scmProviderFor(info, host)
	if !ok {
		return fmt.Errorf("pull request %s isn't on one of this devbox's SCM connections", prURL)
	}
	res := scmpath.Parse(provider, host, http.MethodGet, u.EscapedPath())
	allowed, all := allowlist(info)
	if !all && (!res.Attributable() || !anyAllowed(res.Repos, allowed)) {
		return fmt.Errorf("pull request %s isn't in a repository on this devbox's allowlist", prURL)
	}

	key := prKey(prURL)
	if box, ok := m.prs.boxFor(key); ok {
		if box == info.BoxID {
			return nil
		}
		return fmt.Errorf("pull request %s belongs to another devbox", prURL)
	}
	// Console knows every PR of the box, including ones from the Create PR button, other replicas and earlier runs.
	resp, err := m.ingest.ListDevboxPullRequests(ctx, &devboxv1.ListDevboxPullRequestsRequest{InstanceId: info.InstanceID, Url: key})
	if err != nil {
		return fmt.Errorf("couldn't check who owns pull request %s: %w", prURL, err)
	}
	for _, pr := range resp.GetPullRequests() {
		if pr.GetDevboxId() == info.BoxID && info.BoxID != "" {
			return nil
		}
	}
	return fmt.Errorf("pull request %s wasn't opened from this devbox", prURL)
}

// prRegistry remembers PRs opened through the MCP or observed at egress, keyed by URL, for box ownership checks
// and list_pull_requests. It's per replica and in memory, a cache in front of console's records.
type prRegistry struct {
	mu  sync.Mutex
	prs map[string]trackedPR
}

type trackedPR struct {
	URL        string    `json:"url"`
	Repository string    `json:"repository,omitempty"`
	Number     int64     `json:"number,omitempty"`
	Title      string    `json:"title,omitempty"`
	Status     string    `json:"status,omitempty"`
	Source     string    `json:"source,omitempty"`
	ThreadID   string    `json:"threadId,omitempty"`
	InstanceID string    `json:"instanceId"`
	BoxID      string    `json:"-"`
	CreatedAt  time.Time `json:"createdAt"`
}

func newPRRegistry() *prRegistry { return &prRegistry{prs: map[string]trackedPR{}} }

func prKey(raw string) string {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return strings.TrimSpace(raw)
	}
	u.Host = strings.ToLower(u.Host)
	u.RawQuery, u.Fragment = "", ""
	u.Path = strings.TrimSuffix(u.Path, "/")
	u.RawPath = ""
	return u.String()
}

func (r *prRegistry) record(info *InstanceInfo, url, repository, thread string, number int64) {
	if url == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	key := prKey(url)
	if _, ok := r.prs[key]; ok {
		return
	}
	r.prs[key] = trackedPR{URL: url, Repository: repository, Number: number, ThreadID: thread, InstanceID: info.InstanceID, BoxID: info.BoxID, CreatedAt: time.Now()}
}

func (r *prRegistry) boxFor(key string) (string, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	pr, ok := r.prs[key]
	return pr.BoxID, ok
}

func (r *prRegistry) forInstance(instanceID string) []trackedPR {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := []trackedPR{}
	for _, pr := range r.prs {
		if pr.InstanceID == instanceID {
			out = append(out, pr)
		}
	}
	slices.SortFunc(out, func(a, b trackedPR) int { return a.CreatedAt.Compare(b.CreatedAt) })
	return out
}
