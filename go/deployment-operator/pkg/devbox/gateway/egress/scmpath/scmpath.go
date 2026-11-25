// Package scmpath ties SCM HTTP requests to the repository they act on, from the host, method and raw path only
// (the egress ext_proc sees headers, never bodies). Repository identities are Git.normalize_url-style strings,
// lowercased: "github.com/owner/repo", "gitlab.example.com/group/sub/repo", "dev.azure.com/org/project/_git/repo".
package scmpath

import (
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

// Provider is an SCM flavour.
type Provider string

const (
	GitHub              Provider = "github"
	GitLab              Provider = "gitlab"
	Bitbucket           Provider = "bitbucket"
	BitbucketDataCenter Provider = "bitbucket_datacenter"
	AzureDevOps         Provider = "azure_devops"
	// Unknown is a self-hosted SCM whose flavour wasn't configured; Parse infers it from the path.
	Unknown Provider = ""
)

// ProviderForHost returns the provider of a well-known public SCM host, or of a host named in overrides
// (host -> provider). It returns Unknown for anything else.
func ProviderForHost(host string, overrides map[string]string) Provider {
	host = strings.ToLower(host)
	if p, ok := overrides[host]; ok {
		return Provider(strings.ToLower(p))
	}
	switch {
	case host == "github.com" || host == "api.github.com" || host == "codeload.github.com" ||
		host == "raw.githubusercontent.com" || host == "uploads.github.com":
		return GitHub
	case host == "gitlab.com":
		return GitLab
	case host == "bitbucket.org" || host == "api.bitbucket.org":
		return Bitbucket
	case host == "dev.azure.com" || strings.HasSuffix(host, ".visualstudio.com"):
		return AzureDevOps
	}
	return Unknown
}

// Result is what a request on an SCM host acts on.
type Result struct {
	// Repos are the candidate identities of the repository; the request is allowed if any is allowlisted.
	Repos []string
	// GitLabProjectID is set for GitLab API requests naming a project by numeric ID, which the caller must
	// resolve to a path (Repos is then empty).
	GitLabProjectID string
	// Safe marks repository-independent endpoints that expose no repository data (e.g. GitHub /rate_limit).
	Safe bool
	// Reason explains why a request can't be tied to a repository (Repos empty and not Safe).
	Reason string
	// PullRequest is set when the request creates a pull request.
	PullRequest *PullRequestCreate
}

// Attributable reports whether the request names a repository (possibly pending GitLab ID resolution).
func (r Result) Attributable() bool {
	return len(r.Repos) > 0 || r.GitLabProjectID != ""
}

// PullRequestCreate describes a PR-creation request, so the PR's web URL can be built from the response.
type PullRequestCreate struct {
	Provider Provider
	// WebHost is the host PR pages are served from (github.com for api.github.com).
	WebHost string
	// Repo is the repository path on WebHost, e.g. "owner/repo" or "org/project/_git/repo". For GitLab
	// requests naming a numeric project ID it's empty until the ID is resolved.
	Repo string
	// BitbucketProject and BitbucketRepo are set for Bitbucket Data Center.
	BitbucketProject string
	BitbucketRepo    string
}

// URL builds the PR's web URL and number from the creation response's Location header.
func (pc *PullRequestCreate) URL(location string) (string, int64, bool) {
	n, ok := trailingNumber(location)
	if !ok || pc.WebHost == "" {
		return "", 0, false
	}
	num := strconv.FormatInt(n, 10)
	base := "https://" + pc.WebHost + "/"
	switch pc.Provider {
	case GitHub:
		return base + pc.Repo + "/pull/" + num, n, pc.Repo != ""
	case GitLab:
		return base + pc.Repo + "/-/merge_requests/" + num, n, pc.Repo != ""
	case Bitbucket:
		return base + pc.Repo + "/pull-requests/" + num, n, pc.Repo != ""
	case BitbucketDataCenter:
		return base + "projects/" + pc.BitbucketProject + "/repos/" + pc.BitbucketRepo + "/pull-requests/" + num, n, true
	case AzureDevOps:
		return base + pc.Repo + "/pullrequest/" + num, n, pc.Repo != ""
	}
	return "", 0, false
}

// RepositoryURL is the normalized https URL of the PR's repository.
func (pc *PullRequestCreate) RepositoryURL() string {
	if pc.Provider == BitbucketDataCenter {
		return "https://" + pc.WebHost + "/projects/" + pc.BitbucketProject + "/repos/" + pc.BitbucketRepo
	}
	return "https://" + pc.WebHost + "/" + pc.Repo
}

func trailingNumber(location string) (int64, bool) {
	if location == "" {
		return 0, false
	}
	u, err := url.Parse(location)
	if err != nil {
		return 0, false
	}
	segs := strings.Split(strings.Trim(u.Path, "/"), "/")
	n, err := strconv.ParseInt(segs[len(segs)-1], 10, 64)
	return n, err == nil && n > 0
}

func deny(reason string) Result { return Result{Reason: reason} }

// Parse ties a request to a repository. host must be lowercased without a port; rawPath is the request's :path,
// still percent-encoded, with any query.
func Parse(provider Provider, host, method, rawPath string) Result {
	p := rawPath
	if i := strings.IndexAny(p, "?#"); i >= 0 {
		p = p[:i]
	}
	if bad := suspiciousPath(p); bad != "" {
		return deny(bad)
	}
	segs := splitPath(p)
	if provider == Unknown {
		provider = inferProvider(segs)
	}
	switch provider {
	case GitHub:
		return parseGitHub(host, method, segs)
	case GitLab:
		return parseGitLab(host, method, segs)
	case Bitbucket:
		return parseBitbucket(host, method, segs)
	case BitbucketDataCenter:
		return parseBitbucketDC(host, method, segs)
	case AzureDevOps:
		return parseAzureDevOps(host, method, segs)
	}
	return parseGeneric(host, segs)
}

// suspiciousPath rejects paths an upstream might resolve differently from the parser: dot segments, empty
// segments, backslashes and encoded separators or dots. GitLab's encoded project paths (%2F) are the exception and
// are handled by its parser.
func suspiciousPath(p string) string {
	if !strings.HasPrefix(p, "/") {
		return "request path must be absolute"
	}
	lower := strings.ToLower(p)
	if strings.Contains(p, "\\") || strings.Contains(lower, "%2e") || strings.Contains(lower, "%5c") ||
		strings.Contains(lower, "%00") {
		return "request path uses an unsupported encoding"
	}
	trimmed := strings.TrimSuffix(p[1:], "/")
	if trimmed == "" {
		return ""
	}
	for _, s := range strings.Split(trimmed, "/") {
		if s == "" || s == "." || s == ".." {
			return "request path has empty or dot segments"
		}
	}
	return ""
}

func splitPath(p string) []string {
	p = strings.Trim(p, "/")
	if p == "" {
		return nil
	}
	return strings.Split(p, "/")
}

func unescape(s string) (string, bool) {
	u, err := url.PathUnescape(s)
	return u, err == nil
}

// plain unescapes a segment that must not contain encoded separators.
func plain(s string) (string, bool) {
	if strings.Contains(strings.ToLower(s), "%2f") {
		return "", false
	}
	return unescape(s)
}

func identity(host string, parts ...string) string {
	return strings.ToLower(host + "/" + strings.Join(parts, "/"))
}

func inferProvider(segs []string) Provider {
	switch {
	case len(segs) >= 2 && segs[0] == "api" && segs[1] == "v3":
		return GitHub
	case len(segs) >= 2 && segs[0] == "api" && (segs[1] == "v4" || segs[1] == "graphql"):
		return GitLab
	case len(segs) >= 1 && (segs[0] == "scm" || segs[0] == "rest" || segs[0] == "projects"):
		return BitbucketDataCenter
	}
	for _, s := range segs {
		if s == "_git" || s == "_apis" {
			return AzureDevOps
		}
	}
	return Unknown
}

const graphQLReason = "GraphQL requests can't be tied to a repository (egress sees headers only); use git or the devbox MCP tools"

// GitHub ------------------------------------------------------------------------------------------------------------

// githubReserved are top-level github.com paths that aren't owners.
var githubReserved = map[string]bool{
	"login": true, "logout": true, "join": true, "session": true, "sessions": true, "settings": true, "orgs": true,
	"organizations": true, "search": true, "marketplace": true, "apps": true, "sponsors": true,
	"notifications": true, "explore": true, "topics": true, "collections": true, "trending": true,
	"features": true, "pricing": true, "about": true, "contact": true, "security": true, "site": true,
	"enterprise": true, "enterprises": true, "new": true, "codespaces": true, "pulls": true, "issues": true,
	"dashboard": true, "account": true, "users": true, "stars": true, "watching": true, "assets": true,
	"_private": true, "graphql": true, "api": true, "copilot": true, "github-copilot": true, "models": true,
}

var githubSafeAPI = map[string]bool{"rate_limit": true, "meta": true, "zen": true, "octocat": true, "versions": true}

func parseGitHub(host, method string, segs []string) Result {
	switch host {
	case "api.github.com":
		return parseGitHubAPI("github.com", method, segs)
	case "uploads.github.com":
		return parseGitHubRepos("github.com", segs)
	case "codeload.github.com", "raw.githubusercontent.com":
		return parseOwnerRepo("github.com", segs)
	}
	// GitHub Enterprise Server serves the API, uploads and raw content on its own host.
	switch {
	case len(segs) >= 2 && segs[0] == "api" && segs[1] == "v3":
		return parseGitHubAPI(host, method, segs[2:])
	case len(segs) >= 2 && segs[0] == "api" && segs[1] == "uploads":
		return parseGitHubRepos(host, segs[2:])
	case len(segs) >= 2 && segs[0] == "api" && segs[1] == "graphql":
		return deny(graphQLReason)
	case len(segs) >= 1 && segs[0] == "raw":
		return parseOwnerRepo(host, segs[1:])
	}
	if len(segs) == 0 || githubReserved[segs[0]] {
		return deny("not a repository path")
	}
	if releaseRead(method, segs) {
		return Result{Safe: true}
	}
	return parseOwnerRepo(host, segs)
}

// releaseRead reports whether a request reads a repository's releases: segs is <owner>/<repo>/releases/..., from
// the web path or after /repos on the API. Toolchain installers (mise, aqua, ubi, ruby-build) list and download
// releases of arbitrary repositories, so release reads are allowed outside the repository allowlist; nothing else
// about those repositories is.
func releaseRead(method string, segs []string) bool {
	if method != http.MethodGet && method != http.MethodHead || len(segs) < 3 || segs[2] != "releases" {
		return false
	}
	owner, ok1 := plain(segs[0])
	repo, ok2 := plain(segs[1])
	return ok1 && ok2 && owner != "" && repo != ""
}

func parseGitHubAPI(webHost, method string, segs []string) Result {
	if len(segs) == 0 {
		return Result{Safe: true}
	}
	switch {
	case segs[0] == "graphql":
		return deny(graphQLReason)
	case githubSafeAPI[segs[0]] && len(segs) == 1:
		return Result{Safe: true}
	case segs[0] == "repos" && releaseRead(method, segs[1:]):
		return Result{Safe: true}
	case segs[0] == "repos":
		r := parseGitHubRepos(webHost, segs)
		if len(r.Repos) > 0 && method == http.MethodPost && len(segs) == 4 && segs[3] == "pulls" {
			owner, _ := plain(segs[1])
			repo, _ := plain(segs[2])
			r.PullRequest = &PullRequestCreate{Provider: GitHub, WebHost: webHost, Repo: owner + "/" + repo}
		}
		return r
	case segs[0] == "search":
		return deny("search spans repositories")
	}
	return deny("endpoint isn't scoped to one repository")
}

func parseGitHubRepos(webHost string, segs []string) Result {
	if len(segs) < 3 || segs[0] != "repos" {
		return deny("endpoint isn't scoped to one repository")
	}
	return parseOwnerRepo(webHost, segs[1:])
}

// parseOwnerRepo handles "/<owner>/<repo>[.git]/..." for GitHub and Bitbucket Cloud.
func parseOwnerRepo(host string, segs []string) Result {
	if len(segs) < 2 {
		return deny("not a repository path")
	}
	owner, ok1 := plain(segs[0])
	repo, ok2 := plain(segs[1])
	if !ok1 || !ok2 || owner == "" || repo == "" {
		return deny("not a repository path")
	}
	return Result{Repos: []string{identity(host, owner, strings.TrimSuffix(repo, ".git"))}}
}

// GitLab ------------------------------------------------------------------------------------------------------------

// gitMarkers end a repository path in git smart-HTTP, LFS and GitLab web URLs.
var gitMarkers = map[string]bool{"info": true, "git-upload-pack": true, "git-receive-pack": true, "-": true}

func parseGitLab(host, method string, segs []string) Result {
	if len(segs) >= 2 && segs[0] == "api" {
		if segs[1] == "graphql" {
			return deny(graphQLReason)
		}
		if segs[1] != "v4" {
			return deny("unsupported GitLab API version")
		}
		api := segs[2:]
		if len(api) < 2 || api[0] != "projects" {
			return deny("endpoint isn't scoped to one project")
		}
		project, ok := unescape(api[1])
		if !ok || project == "" {
			return deny("invalid project reference")
		}
		create := method == http.MethodPost && len(api) == 3 && api[2] == "merge_requests"
		if _, err := strconv.ParseInt(project, 10, 64); err == nil {
			r := Result{GitLabProjectID: project}
			if create {
				r.PullRequest = &PullRequestCreate{Provider: GitLab, WebHost: host}
			}
			return r
		}
		for _, s := range strings.Split(project, "/") {
			if s == "" || s == "." || s == ".." {
				return deny("invalid project reference")
			}
		}
		r := Result{Repos: []string{identity(host, strings.TrimSuffix(project, ".git"))}}
		if create {
			r.PullRequest = &PullRequestCreate{Provider: GitLab, WebHost: host, Repo: project}
		}
		return r
	}
	return parseNested(host, segs)
}

// parseNested handles nested-namespace repository paths (GitLab groups, unknown SCMs): the repository ends at a
// ".git" segment or a git marker; failing both, every prefix of two or more segments is a candidate. GitLab
// doesn't allow a project and a subgroup with the same path, so a prefix names at most one project.
func parseNested(host string, segs []string) Result {
	var parts []string
	for _, s := range segs {
		seg, ok := plain(s)
		if !ok {
			return deny("request path uses an unsupported encoding")
		}
		if gitMarkers[seg] {
			break
		}
		if strings.HasSuffix(seg, ".git") {
			parts = append(parts, strings.TrimSuffix(seg, ".git"))
			if len(parts) < 2 {
				return deny("not a repository path")
			}
			return Result{Repos: []string{identity(host, parts...)}}
		}
		parts = append(parts, seg)
	}
	if len(parts) < 2 {
		return deny("not a repository path")
	}
	if len(parts) < len(segs) {
		return Result{Repos: []string{identity(host, parts...)}}
	}
	repos := make([]string, 0, len(parts)-1)
	for i := 2; i <= len(parts); i++ {
		repos = append(repos, identity(host, parts[:i]...))
	}
	return Result{Repos: repos}
}

func parseGeneric(host string, segs []string) Result {
	return parseNested(host, segs)
}

// Bitbucket ---------------------------------------------------------------------------------------------------------

func parseBitbucket(host, method string, segs []string) Result {
	if host == "api.bitbucket.org" {
		if len(segs) < 4 || segs[0] != "2.0" || segs[1] != "repositories" {
			return deny("endpoint isn't scoped to one repository")
		}
		r := parseOwnerRepo("bitbucket.org", segs[2:])
		if len(r.Repos) > 0 && method == http.MethodPost && len(segs) == 5 && segs[4] == "pullrequests" {
			ws, _ := plain(segs[2])
			repo, _ := plain(segs[3])
			r.PullRequest = &PullRequestCreate{Provider: Bitbucket, WebHost: "bitbucket.org", Repo: ws + "/" + repo}
		}
		return r
	}
	if len(segs) == 0 || strings.HasPrefix(segs[0], "!") || segs[0] == "account" || segs[0] == "dashboard" ||
		segs[0] == "site" || segs[0] == "socialauth" || segs[0] == "repo" {
		return deny("not a repository path")
	}
	return parseOwnerRepo(host, segs)
}

func parseBitbucketDC(host, method string, segs []string) Result {
	var project, repo string
	var create bool
	switch {
	case len(segs) >= 3 && segs[0] == "scm":
		project, repo = segs[1], strings.TrimSuffix(segs[2], ".git")
	case len(segs) >= 7 && segs[0] == "rest" && segs[1] == "api" && segs[3] == "projects" && segs[5] == "repos":
		project, repo = segs[4], segs[6]
		create = method == http.MethodPost && len(segs) == 8 && segs[7] == "pull-requests"
	case len(segs) >= 4 && segs[0] == "projects" && segs[2] == "repos":
		project, repo = segs[1], segs[3]
	default:
		return deny("not a repository path")
	}
	p, ok1 := plain(project)
	r, ok2 := plain(repo)
	if !ok1 || !ok2 || p == "" || r == "" {
		return deny("not a repository path")
	}
	res := Result{Repos: []string{identity(host, "scm", p, r), identity(host, p, r), identity(host, "projects", p, "repos", r)}}
	if create {
		res.PullRequest = &PullRequestCreate{Provider: BitbucketDataCenter, WebHost: host, BitbucketProject: p, BitbucketRepo: r}
	}
	return res
}

// Azure DevOps ------------------------------------------------------------------------------------------------------

func parseAzureDevOps(host, method string, segs []string) Result {
	// <org>.visualstudio.com/<project>/... is dev.azure.com/<org>/<project>/...
	webHost, org := host, ""
	if strings.HasSuffix(host, ".visualstudio.com") {
		org = strings.TrimSuffix(host, ".visualstudio.com")
		if len(segs) > 0 && strings.EqualFold(segs[0], "defaultcollection") {
			segs = segs[1:]
		}
	} else {
		if len(segs) == 0 {
			return deny("not a repository path")
		}
		org, segs = segs[0], segs[1:]
	}
	clean := make([]string, len(segs))
	for i, s := range segs {
		v, ok := plain(s)
		if !ok {
			return deny("request path uses an unsupported encoding")
		}
		clean[i] = v
	}
	segs = clean

	var project, repo string
	var create bool
	switch {
	case len(segs) >= 2 && segs[0] == "_git":
		repo = segs[1]
	case len(segs) >= 3 && segs[1] == "_git":
		project, repo = segs[0], segs[2]
	case len(segs) >= 5 && segs[1] == "_apis" && segs[2] == "git" && segs[3] == "repositories":
		project, repo = segs[0], segs[4]
		create = method == http.MethodPost && len(segs) == 6 && strings.EqualFold(segs[5], "pullrequests")
	case len(segs) >= 4 && segs[0] == "_apis" && segs[1] == "git" && segs[2] == "repositories":
		repo = segs[3]
	default:
		return deny("endpoint isn't scoped to one repository")
	}
	repo = strings.TrimSuffix(repo, ".git")
	if repo == "" {
		return deny("not a repository path")
	}

	var repos []string
	add := func(proj string) {
		repos = append(repos, identity("dev.azure.com", org, proj, "_git", repo))
		if webHost != "dev.azure.com" {
			repos = append(repos, identity(webHost, proj, "_git", repo))
		}
	}
	if project == "" {
		// The project-less form only resolves when the project shares the repository's name.
		repos = append(repos, identity("dev.azure.com", org, "_git", repo))
		add(repo)
	} else {
		add(project)
		if strings.EqualFold(project, repo) {
			repos = append(repos, identity("dev.azure.com", org, "_git", repo))
		}
	}
	res := Result{Repos: repos}
	if create {
		res.PullRequest = &PullRequestCreate{Provider: AzureDevOps, WebHost: "dev.azure.com", Repo: org + "/" + project + "/_git/" + repo}
	}
	return res
}

// Normalize turns a repository URL into its identity, following Git.normalize_url (trailing ".git" removed,
// git@host:path and scheme://host/path both become host/path), lowercased, with userinfo, ports and trailing
// slashes dropped.
func Normalize(raw string) string {
	s := strings.TrimSpace(raw)
	s = strings.TrimSuffix(s, "/")
	s = strings.TrimSuffix(s, ".git")
	if rest, ok := strings.CutPrefix(s, "git@"); ok {
		if host, path, ok := strings.Cut(rest, ":"); ok {
			return strings.ToLower(host + "/" + strings.Trim(path, "/"))
		}
		return strings.ToLower(rest)
	}
	if strings.Contains(s, "://") {
		if u, err := url.Parse(s); err == nil && u.Host != "" {
			host := u.Hostname()
			if h, _, err := net.SplitHostPort(u.Host); err == nil {
				host = h
			}
			return strings.ToLower(host + "/" + strings.Trim(u.Path, "/"))
		}
	}
	return strings.ToLower(strings.Trim(s, "/"))
}
