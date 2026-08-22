package scm

import (
	"testing"

	adogit "github.com/microsoft/azure-devops-go-api/azuredevops/v7/git"
	"github.com/samber/lo"
	"github.com/stretchr/testify/require"
)

func TestParseADOPRURLFormats(t *testing.T) {
	t.Parallel()

	parsed, err := parseADOPRURL("https://dev.azure.com/org/project/_git/repo/pullrequest/11")
	require.NoError(t, err)
	require.Equal(t, adoParsedURL{org: "org", project: "project", repo: "repo", prID: 11}, parsed)

	parsed, err = parseADOPRURL("https://contoso.visualstudio.com/project/_git/repo/pullrequest/11")
	require.NoError(t, err)
	require.Equal(t, adoParsedURL{org: "contoso", project: "project", repo: "repo", prID: 11}, parsed)
}

func TestADOSummaryPollability(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		status   adogit.PullRequestStatus
		want     PRState
		pollable bool
	}{
		{name: "active", status: adogit.PullRequestStatusValues.Active, want: PRStateOpen, pollable: true},
		{name: "completed", status: adogit.PullRequestStatusValues.Completed, want: PRStateMerged, pollable: false},
		{name: "abandoned", status: adogit.PullRequestStatusValues.Abandoned, want: PRStateClosed, pollable: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			status := tt.status
			details := adoSummaryFromPR(&adogit.GitPullRequest{
				Title:         lo.ToPtr("Fix"),
				Description:   lo.ToPtr("n"),
				SourceRefName: lo.ToPtr("refs/heads/feat/x"),
				Status:        &status,
			})
			require.Equal(t, "Fix", details.Title)
			require.Equal(t, "feat/x", details.HeadRef)
			require.Equal(t, tt.want, details.State)
			require.Equal(t, tt.pollable, details.Pollable())
			require.Empty(t, details.Comments)
			require.Empty(t, details.CIChecks)
		})
	}
}