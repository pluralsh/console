package scm

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseGitHubPRURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		url    string
		owner  string
		repo   string
		number int
	}{
		{
			name:   "github.com",
			url:    "https://github.com/pluralsh/console/pull/42",
			owner:  "pluralsh",
			repo:   "console",
			number: 42,
		},
		{
			name:   "github enterprise hostname",
			url:    "https://github.mycompany.com/acme/app/pull/7",
			owner:  "acme",
			repo:   "app",
			number: 7,
		},
		{
			name:   "self-hosted without github in host",
			url:    "https://git.internal.example.com/acme/app/pull/12",
			owner:  "acme",
			repo:   "app",
			number: 12,
		},
		{
			name:   "trailing slash and extra path",
			url:    "https://git.internal.example.com/acme/app/pull/12/files",
			owner:  "acme",
			repo:   "app",
			number: 12,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			owner, repo, number, err := parseGitHubPRURL(tt.url)
			require.NoError(t, err)
			require.Equal(t, tt.owner, owner)
			require.Equal(t, tt.repo, repo)
			require.Equal(t, tt.number, number)
		})
	}
}

func TestParseGitHubPRURLRejectsNonGitHubPaths(t *testing.T) {
	t.Parallel()

	_, _, _, err := parseGitHubPRURL("https://gitlab.com/group/project/-/merge_requests/1")
	require.Error(t, err)
}

func TestParseGitLabMRURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		url     string
		project string
		iid     int64
	}{
		{
			name:    "gitlab.com nested groups",
			url:     "https://gitlab.com/group/subgroup/project/-/merge_requests/123",
			project: "group/subgroup/project",
			iid:     123,
		},
		{
			name:    "self-hosted without gitlab in host",
			url:     "https://git.internal.example.com/group/project/-/merge_requests/9",
			project: "group/project",
			iid:     9,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			project, iid, err := parseGitLabMRURL(tt.url)
			require.NoError(t, err)
			require.Equal(t, tt.project, project)
			require.Equal(t, tt.iid, iid)
		})
	}
}

func TestParseBitbucketAndAzureURLs(t *testing.T) {
	t.Parallel()

	workspace, repo, id, err := parseCloudPRURL("https://bitbucket.org/acme/app/pull-requests/5")
	require.NoError(t, err)
	require.Equal(t, "acme", workspace)
	require.Equal(t, "app", repo)
	require.Equal(t, int64(5), id)

	project, dcRepo, dcID, err := parseDCPRURL("https://bitbucket.internal.example.com/projects/PROJ/repos/app/pull-requests/8")
	require.NoError(t, err)
	require.Equal(t, "PROJ", project)
	require.Equal(t, "app", dcRepo)
	require.Equal(t, int64(8), dcID)

	parsed, err := parseADOPRURL("https://dev.azure.com/org/project/_git/repo/pullrequest/11")
	require.NoError(t, err)
	require.Equal(t, "org", parsed.org)
	require.Equal(t, "project", parsed.project)
	require.Equal(t, "repo", parsed.repo)
	require.Equal(t, 11, parsed.prID)
}

func TestClientForDispatchesSelfHostedURLs(t *testing.T) {
	t.Parallel()

	d := &dispatchClient{token: "token"}
	tests := []struct {
		url      string
		wantType string
	}{
		{"https://git.internal.example.com/acme/app/pull/12", "*scm.gitHubClient"},
		{"https://github.com/pluralsh/console/pull/1", "*scm.gitHubClient"},
		{"https://git.internal.example.com/group/project/-/merge_requests/9", "*scm.gitLabClient"},
		{"https://gitlab.com/group/project/-/merge_requests/9", "*scm.gitLabClient"},
		{"https://bitbucket.org/acme/app/pull-requests/5", "*scm.bitBucketCloudClient"},
		{"https://bitbucket.internal.example.com/projects/PROJ/repos/app/pull-requests/8", "*scm.bitBucketDCClient"},
		{"https://dev.azure.com/org/project/_git/repo/pullrequest/11", "*scm.azureDevOpsClient"},
		{"https://contoso.visualstudio.com/project/_git/repo/pullrequest/11", "*scm.azureDevOpsClient"},
	}

	for _, tt := range tests {
		t.Run(tt.url, func(t *testing.T) {
			t.Parallel()
			client, err := d.clientFor(tt.url)
			require.NoError(t, err)
			require.Equal(t, tt.wantType, fmt.Sprintf("%T", client))
		})
	}
}

func TestPRDetailsPollable(t *testing.T) {
	t.Parallel()

	require.False(t, (*PRDetails)(nil).Pollable())
	require.True(t, (&PRDetails{State: PRStateOpen}).Pollable())
	require.False(t, (&PRDetails{State: PRStateMerged}).Pollable())
	require.False(t, (&PRDetails{State: PRStateClosed}).Pollable())
}
