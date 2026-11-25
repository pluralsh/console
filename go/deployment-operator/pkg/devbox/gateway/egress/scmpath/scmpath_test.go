package scmpath

import (
	"reflect"
	"testing"
)

type parseCase struct {
	name     string
	host     string
	method   string
	path     string
	repos    []string
	safe     bool
	deny     bool
	gitlabID string
	// prRepo is the expected PullRequestCreate.Repo, "" for no PR creation.
	prRepo string
}

func runParseCases(t *testing.T, provider Provider, cases []parseCase) {
	t.Helper()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			method := tc.method
			if method == "" {
				method = "GET"
			}
			got := Parse(provider, tc.host, method, tc.path)
			if tc.deny {
				if got.Attributable() || got.Safe {
					t.Fatalf("want deny, got %+v", got)
				}
				if got.Reason == "" {
					t.Fatalf("denied result has no reason: %+v", got)
				}
				return
			}
			if !reflect.DeepEqual(got.Repos, tc.repos) {
				t.Errorf("repos = %v, want %v", got.Repos, tc.repos)
			}
			if got.Safe != tc.safe {
				t.Errorf("safe = %v, want %v", got.Safe, tc.safe)
			}
			if got.GitLabProjectID != tc.gitlabID {
				t.Errorf("gitlab id = %q, want %q", got.GitLabProjectID, tc.gitlabID)
			}
			switch {
			case tc.prRepo == "" && got.PullRequest != nil && tc.gitlabID == "":
				t.Errorf("unexpected PR creation %+v", got.PullRequest)
			case tc.prRepo != "" && got.PullRequest == nil:
				t.Errorf("expected PR creation for %s", tc.prRepo)
			case tc.prRepo != "" && tc.prRepo != "-" && got.PullRequest.Repo != tc.prRepo:
				t.Errorf("PR repo = %q, want %q", got.PullRequest.Repo, tc.prRepo)
			}
		})
	}
}

func TestParseGitHub(t *testing.T) {
	gh := []string{"github.com/pluralsh/console"}
	runParseCases(t, GitHub, []parseCase{
		{name: "smart http info/refs", host: "github.com", path: "/pluralsh/console.git/info/refs?service=git-upload-pack", repos: gh},
		{name: "upload-pack", host: "github.com", method: "POST", path: "/pluralsh/console.git/git-upload-pack", repos: gh},
		{name: "receive-pack without .git", host: "github.com", method: "POST", path: "/pluralsh/console/git-receive-pack", repos: gh},
		{name: "case folded", host: "github.com", path: "/PluralSH/Console/info/refs", repos: gh},
		{name: "lfs batch", host: "github.com", method: "POST", path: "/pluralsh/console.git/info/lfs/objects/batch", repos: gh},
		{name: "web reserved path", host: "github.com", path: "/settings/tokens", deny: true},
		{name: "web root", host: "github.com", path: "/", deny: true},
		{name: "owner only", host: "github.com", path: "/pluralsh", deny: true},
		{name: "api repo", host: "api.github.com", path: "/repos/pluralsh/console/pulls/12", repos: gh},
		{name: "api create PR", host: "api.github.com", method: "POST", path: "/repos/pluralsh/console/pulls", repos: gh, prRepo: "pluralsh/console"},
		{name: "api list PRs is not a creation", host: "api.github.com", path: "/repos/pluralsh/console/pulls", repos: gh},
		{name: "api PR comment is not a creation", host: "api.github.com", method: "POST", path: "/repos/pluralsh/console/pulls/1/comments", repos: gh},
		{name: "api graphql", host: "api.github.com", method: "POST", path: "/graphql", deny: true},
		{name: "api search", host: "api.github.com", path: "/search/code?q=secret", deny: true},
		{name: "api org-wide", host: "api.github.com", path: "/orgs/pluralsh/repos", deny: true},
		{name: "api user repos", host: "api.github.com", path: "/user/repos", deny: true},
		{name: "api rate limit", host: "api.github.com", path: "/rate_limit", safe: true},
		{name: "api meta", host: "api.github.com", path: "/meta", safe: true},
		{name: "api root", host: "api.github.com", path: "/", safe: true},
		{name: "api repos short", host: "api.github.com", path: "/repos/pluralsh", deny: true},
		{name: "codeload", host: "codeload.github.com", path: "/pluralsh/console/tar.gz/refs/heads/master", repos: gh},
		{name: "raw", host: "raw.githubusercontent.com", path: "/pluralsh/console/master/README.md", repos: gh},
		{name: "uploads", host: "uploads.github.com", method: "POST", path: "/repos/pluralsh/console/releases/1/assets", repos: gh},
		{name: "uploads not repo scoped", host: "uploads.github.com", path: "/user/1", deny: true},
		{name: "dot segment", host: "github.com", path: "/pluralsh/../other/repo/info/refs", deny: true},
		{name: "encoded dot", host: "api.github.com", path: "/repos/pluralsh/console/%2e%2e/%2e%2e/orgs/x", deny: true},
		{name: "encoded slash", host: "api.github.com", path: "/repos/pluralsh%2Fconsole/x/pulls", deny: true},
		{name: "empty segment", host: "api.github.com", path: "/repos//pluralsh/console", deny: true},
		{name: "backslash", host: "github.com", path: "/pluralsh\\console", deny: true},
		{name: "relative", host: "github.com", path: "pluralsh/console", deny: true},
		{name: "release download", host: "github.com", path: "/astral-sh/python-build-standalone/releases/download/20261101/cpython.tar.gz", safe: true},
		{name: "latest release redirect", host: "github.com", method: "HEAD", path: "/jdx/mise/releases/latest", safe: true},
		{name: "api releases", host: "api.github.com", path: "/repos/oven-sh/bun/releases?per_page=100", safe: true},
		{name: "api release asset", host: "api.github.com", path: "/repos/oven-sh/bun/releases/assets/1", safe: true},
		{name: "api release edit is repo scoped", host: "api.github.com", method: "PATCH", path: "/repos/pluralsh/console/releases/1", repos: gh},
		{name: "api release create is repo scoped", host: "api.github.com", method: "POST", path: "/repos/pluralsh/console/releases", repos: gh},
		{name: "release delete is repo scoped", host: "github.com", method: "DELETE", path: "/pluralsh/console/releases/tag/v1", repos: gh},
		{name: "release with encoded slash", host: "github.com", path: "/pluralsh%2Fconsole/x/releases/latest", deny: true},
		{name: "api release with encoded slash", host: "api.github.com", path: "/repos/pluralsh%2Fconsole/x/releases", deny: true},
	})
}

func TestParseGitHubEnterprise(t *testing.T) {
	repo := []string{"ghe.example.com/team/svc"}
	runParseCases(t, GitHub, []parseCase{
		{name: "git", host: "ghe.example.com", path: "/team/svc.git/info/refs", repos: repo},
		{name: "api", host: "ghe.example.com", path: "/api/v3/repos/team/svc/commits", repos: repo},
		{name: "api create PR", host: "ghe.example.com", method: "POST", path: "/api/v3/repos/team/svc/pulls", repos: repo, prRepo: "team/svc"},
		{name: "api graphql", host: "ghe.example.com", method: "POST", path: "/api/graphql", deny: true},
		{name: "api search", host: "ghe.example.com", path: "/api/v3/search/issues", deny: true},
		{name: "uploads", host: "ghe.example.com", path: "/api/uploads/repos/team/svc/releases/1/assets", repos: repo},
		{name: "raw", host: "ghe.example.com", path: "/raw/team/svc/main/file", repos: repo},
		{name: "release download", host: "ghe.example.com", path: "/tools/cli/releases/download/v1/cli.tgz", safe: true},
		{name: "api releases", host: "ghe.example.com", path: "/api/v3/repos/tools/cli/releases/latest", safe: true},
	})
}

func TestParseGitLab(t *testing.T) {
	runParseCases(t, GitLab, []parseCase{
		{name: "git nested", host: "gitlab.com", path: "/group/sub/repo.git/info/refs", repos: []string{"gitlab.com/group/sub/repo"}},
		{name: "git marker without .git", host: "gitlab.com", method: "POST", path: "/group/repo/git-upload-pack", repos: []string{"gitlab.com/group/repo"}},
		{name: "web dash", host: "gitlab.com", path: "/group/sub/repo/-/merge_requests/3", repos: []string{"gitlab.com/group/sub/repo"}},
		{name: "ambiguous prefixes", host: "gitlab.com", path: "/group/sub/repo", repos: []string{"gitlab.com/group/sub", "gitlab.com/group/sub/repo"}},
		{name: "api encoded path", host: "gitlab.com", path: "/api/v4/projects/group%2Fsub%2Frepo/repository/files/x", repos: []string{"gitlab.com/group/sub/repo"}},
		{name: "api create MR", host: "gitlab.example.com", method: "POST", path: "/api/v4/projects/group%2Frepo/merge_requests", repos: []string{"gitlab.example.com/group/repo"}, prRepo: "group/repo"},
		{name: "api numeric id", host: "gitlab.com", path: "/api/v4/projects/1234/repository/tree", gitlabID: "1234"},
		{name: "api numeric id create MR", host: "gitlab.com", method: "POST", path: "/api/v4/projects/1234/merge_requests", gitlabID: "1234", prRepo: "-"},
		{name: "api graphql", host: "gitlab.com", method: "POST", path: "/api/graphql", deny: true},
		{name: "api search", host: "gitlab.com", path: "/api/v4/search?scope=blobs", deny: true},
		{name: "api groups", host: "gitlab.com", path: "/api/v4/groups/1/projects", deny: true},
		{name: "api v3", host: "gitlab.com", path: "/api/v3/projects/1", deny: true},
		{name: "api encoded traversal", host: "gitlab.com", path: "/api/v4/projects/group%2F..%2Fother", deny: true},
		{name: "single segment", host: "gitlab.com", path: "/group", deny: true},
	})
}

func TestParseBitbucket(t *testing.T) {
	bb := []string{"bitbucket.org/ws/repo"}
	runParseCases(t, Bitbucket, []parseCase{
		{name: "git", host: "bitbucket.org", path: "/ws/repo.git/info/refs", repos: bb},
		{name: "web reserved", host: "bitbucket.org", path: "/account/settings", deny: true},
		{name: "web bang", host: "bitbucket.org", path: "/!api/internal", deny: true},
		{name: "api repo", host: "api.bitbucket.org", path: "/2.0/repositories/ws/repo/src", repos: bb},
		{name: "api create PR", host: "api.bitbucket.org", method: "POST", path: "/2.0/repositories/ws/repo/pullrequests", repos: bb, prRepo: "ws/repo"},
		{name: "api workspace", host: "api.bitbucket.org", path: "/2.0/repositories/ws", deny: true},
		{name: "api user", host: "api.bitbucket.org", path: "/2.0/user", deny: true},
	})
}

func TestParseBitbucketDataCenter(t *testing.T) {
	ids := []string{"bb.example.com/scm/proj/repo", "bb.example.com/proj/repo", "bb.example.com/projects/proj/repos/repo"}
	runParseCases(t, BitbucketDataCenter, []parseCase{
		{name: "git", host: "bb.example.com", path: "/scm/proj/repo.git/info/refs", repos: ids},
		{name: "rest", host: "bb.example.com", path: "/rest/api/1.0/projects/PROJ/repos/repo/commits", repos: ids},
		{name: "rest create PR", host: "bb.example.com", method: "POST", path: "/rest/api/latest/projects/proj/repos/repo/pull-requests", repos: ids, prRepo: "-"},
		{name: "web", host: "bb.example.com", path: "/projects/proj/repos/repo/browse", repos: ids},
		{name: "rest search", host: "bb.example.com", path: "/rest/search/latest/search", deny: true},
		{name: "rest projects", host: "bb.example.com", path: "/rest/api/1.0/projects", deny: true},
	})
}

func TestParseAzureDevOps(t *testing.T) {
	runParseCases(t, AzureDevOps, []parseCase{
		{name: "git", host: "dev.azure.com", path: "/org/proj/_git/repo/info/refs", repos: []string{"dev.azure.com/org/proj/_git/repo"}},
		{name: "git project-less", host: "dev.azure.com", path: "/org/_git/repo/info/refs", repos: []string{"dev.azure.com/org/_git/repo", "dev.azure.com/org/repo/_git/repo"}},
		{name: "api", host: "dev.azure.com", path: "/org/proj/_apis/git/repositories/repo/items", repos: []string{"dev.azure.com/org/proj/_git/repo"}},
		{name: "api create PR", host: "dev.azure.com", method: "POST", path: "/org/proj/_apis/git/repositories/repo/pullrequests?api-version=7.1", repos: []string{"dev.azure.com/org/proj/_git/repo"}, prRepo: "org/proj/_git/repo"},
		{name: "api org-level repo", host: "dev.azure.com", path: "/org/_apis/git/repositories/repo", repos: []string{"dev.azure.com/org/_git/repo", "dev.azure.com/org/repo/_git/repo"}},
		{name: "api org-wide", host: "dev.azure.com", path: "/org/_apis/projects", deny: true},
		{name: "api search", host: "dev.azure.com", path: "/org/proj/_apis/search/codesearchresults", deny: true},
		{name: "visualstudio", host: "org.visualstudio.com", path: "/DefaultCollection/proj/_git/repo", repos: []string{"dev.azure.com/org/proj/_git/repo", "org.visualstudio.com/proj/_git/repo"}},
	})
}

func TestParseUnknownInfersProvider(t *testing.T) {
	runParseCases(t, Unknown, []parseCase{
		{name: "github enterprise api", host: "git.corp", path: "/api/v3/repos/a/b", repos: []string{"git.corp/a/b"}},
		{name: "gitlab graphql", host: "git.corp", method: "POST", path: "/api/graphql", deny: true},
		{name: "bitbucket dc", host: "git.corp", path: "/scm/p/r.git/info/refs", repos: []string{"git.corp/scm/p/r", "git.corp/p/r", "git.corp/projects/p/repos/r"}},
		{name: "generic git", host: "git.corp", path: "/a/b.git/info/refs", repos: []string{"git.corp/a/b"}},
	})
}

func TestProviderForHost(t *testing.T) {
	cases := map[string]Provider{
		"github.com":                GitHub,
		"API.GITHUB.COM":            GitHub,
		"raw.githubusercontent.com": GitHub,
		"gitlab.com":                GitLab,
		"api.bitbucket.org":         Bitbucket,
		"dev.azure.com":             AzureDevOps,
		"org.visualstudio.com":      AzureDevOps,
		"git.corp":                  Unknown,
	}
	for host, want := range cases {
		if got := ProviderForHost(host, nil); got != want {
			t.Errorf("ProviderForHost(%q) = %q, want %q", host, got, want)
		}
	}
	if got := ProviderForHost("git.corp", map[string]string{"git.corp": "GitLab"}); got != GitLab {
		t.Errorf("override = %q", got)
	}
}

func TestPullRequestURL(t *testing.T) {
	cases := []struct {
		pc       PullRequestCreate
		location string
		url      string
		number   int64
	}{
		{PullRequestCreate{Provider: GitHub, WebHost: "github.com", Repo: "o/r"}, "https://api.github.com/repos/o/r/pulls/42", "https://github.com/o/r/pull/42", 42},
		{PullRequestCreate{Provider: GitLab, WebHost: "gitlab.com", Repo: "g/s/r"}, "https://gitlab.com/api/v4/projects/1/merge_requests/7", "https://gitlab.com/g/s/r/-/merge_requests/7", 7},
		{PullRequestCreate{Provider: Bitbucket, WebHost: "bitbucket.org", Repo: "ws/r"}, "https://api.bitbucket.org/2.0/repositories/ws/r/pullrequests/3", "https://bitbucket.org/ws/r/pull-requests/3", 3},
		{PullRequestCreate{Provider: BitbucketDataCenter, WebHost: "bb.corp", BitbucketProject: "p", BitbucketRepo: "r"}, "/rest/api/1.0/projects/p/repos/r/pull-requests/9", "https://bb.corp/projects/p/repos/r/pull-requests/9", 9},
		{PullRequestCreate{Provider: AzureDevOps, WebHost: "dev.azure.com", Repo: "o/p/_git/r"}, "https://dev.azure.com/o/p/_apis/git/repositories/r/pullRequests/11", "https://dev.azure.com/o/p/_git/r/pullrequest/11", 11},
	}
	for _, tc := range cases {
		url, n, ok := tc.pc.URL(tc.location)
		if !ok || url != tc.url || n != tc.number {
			t.Errorf("%s: URL(%q) = %q, %d, %v; want %q, %d", tc.pc.Provider, tc.location, url, n, ok, tc.url, tc.number)
		}
	}
	if _, _, ok := (&PullRequestCreate{Provider: GitHub, WebHost: "github.com", Repo: "o/r"}).URL(""); ok {
		t.Error("empty location must not produce a URL")
	}
	if _, _, ok := (&PullRequestCreate{Provider: GitLab, WebHost: "gitlab.com"}).URL("/x/5"); ok {
		t.Error("unresolved GitLab repo must not produce a URL")
	}
}

func TestNormalize(t *testing.T) {
	cases := map[string]string{
		"https://github.com/Pluralsh/Console.git":      "github.com/pluralsh/console",
		"git@github.com:pluralsh/console.git":          "github.com/pluralsh/console",
		"github.com/pluralsh/console/":                 "github.com/pluralsh/console",
		"https://user:pw@gitlab.corp:8443/g/s/r":       "gitlab.corp/g/s/r",
		"ssh://git@bb.corp:7999/scm/p/r.git":           "bb.corp/scm/p/r",
		"https://dev.azure.com/org/proj/_git/repo.git": "dev.azure.com/org/proj/_git/repo",
	}
	for in, want := range cases {
		if got := Normalize(in); got != want {
			t.Errorf("Normalize(%q) = %q, want %q", in, got, want)
		}
	}
}
