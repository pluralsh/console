package scm

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	gogithub "github.com/google/go-github/v68/github"
	"github.com/stretchr/testify/require"
)

func TestGitHubAllCommentsIncludesReviewSummaries(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/repos/o/r/issues/1/comments":
			_, _ = fmt.Fprint(w, `[{
				"id": 11,
				"user": {"login": "human"},
				"body": "issue comment",
				"created_at": "2026-01-01T00:00:00Z"
			}]`)
		case "/repos/o/r/pulls/1/comments":
			_, _ = fmt.Fprint(w, `[{
				"id": 22,
				"user": {"login": "reviewer"},
				"body": "inline review comment",
				"path": "pkg/auth/session.go",
				"start_line": 12,
				"line": 14,
				"created_at": "2026-01-01T00:01:00Z"
			}]`)
		case "/repos/o/r/pulls/1/reviews":
			_, _ = fmt.Fprint(w, `[{
				"id": 33,
				"user": {"login": "bot-reviewer"},
				"body": "summary review feedback",
				"submitted_at": "2026-01-01T00:02:00Z",
				"state": "COMMENTED"
			}, {
				"id": 44,
				"user": {"login": "approver"},
				"body": "",
				"submitted_at": "2026-01-01T00:03:00Z",
				"state": "APPROVED"
			}]`)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(server.Close)

	baseURL, err := url.Parse(server.URL + "/")
	require.NoError(t, err)

	client := &gitHubClient{gh: gogithub.NewClient(server.Client())}
	client.gh.BaseURL = baseURL

	comments, err := client.allComments(context.Background(), "o", "r", 1)
	require.NoError(t, err)
	require.Len(t, comments, 3)

	require.Equal(t, PRCommentTypeIssue, comments[0].Type)
	require.Equal(t, "issue comment", comments[0].Body)
	require.Equal(t, PRCommentTypeReview, comments[1].Type)
	require.Equal(t, "inline review comment", comments[1].Body)
	require.Equal(t, "pkg/auth/session.go:12-14", comments[1].Location())
	require.Equal(t, PRCommentTypeReviewSummary, comments[2].Type)
	require.Equal(t, "bot-reviewer", comments[2].Author)
	require.Equal(t, "summary review feedback", comments[2].Body)
	require.False(t, comments[2].Reactable())
}

func testGitHubClient(t *testing.T, handler http.HandlerFunc) *gitHubClient {
	t.Helper()

	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)

	baseURL, err := url.Parse(server.URL + "/")
	require.NoError(t, err)

	client := &gitHubClient{gh: gogithub.NewClient(server.Client())}
	client.gh.BaseURL = baseURL
	return client
}

func TestGitHubGetPRSummaryPollability(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		body     string
		want     PRState
		pollable bool
	}{
		{
			name:     "open",
			body:     `{"title":"Fix","body":"n","state":"open","merged_at":null,"head":{"ref":"feat/x","sha":"abc"}}`,
			want:     PRStateOpen,
			pollable: true,
		},
		{
			name:     "closed",
			body:     `{"title":"Fix","body":"n","state":"closed","merged_at":null,"head":{"ref":"feat/x","sha":"abc"}}`,
			want:     PRStateClosed,
			pollable: false,
		},
		{
			name:     "merged",
			body:     `{"title":"Fix","body":"n","state":"closed","merged_at":"2026-01-01T00:00:00Z","head":{"ref":"feat/x","sha":"abc"}}`,
			want:     PRStateMerged,
			pollable: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			client := testGitHubClient(t, func(w http.ResponseWriter, r *http.Request) {
				require.Equal(t, "/repos/acme/app/pulls/12", r.URL.Path)
				_, _ = fmt.Fprint(w, tt.body)
			})

			details, err := client.GetPRSummary(context.Background(), "https://git.internal.example.com/acme/app/pull/12")
			require.NoError(t, err)
			require.Equal(t, "Fix", details.Title)
			require.Equal(t, "feat/x", details.HeadRef)
			require.Equal(t, tt.want, details.State)
			require.Equal(t, tt.pollable, details.Pollable())
			require.Empty(t, details.Comments)
			require.Empty(t, details.CIChecks)
		})
	}
}

func TestGitHubGetPRDetailsIncludesCommentsAndChecks(t *testing.T) {
	t.Parallel()

	client := testGitHubClient(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/repos/acme/app/pulls/12":
			_, _ = fmt.Fprint(w, `{"title":"Fix","body":"n","state":"open","merged_at":null,"head":{"ref":"feat/x","sha":"abc123"}}`)
		case "/repos/acme/app/issues/12/comments":
			_, _ = fmt.Fprint(w, `[{"id":11,"user":{"login":"human"},"body":"please fix","created_at":"2026-01-01T00:00:00Z"}]`)
		case "/repos/acme/app/pulls/12/comments", "/repos/acme/app/pulls/12/reviews":
			_, _ = fmt.Fprint(w, `[]`)
		case "/repos/acme/app/commits/abc123/check-runs":
			_, _ = fmt.Fprint(w, `{"check_runs":[{"id":99,"name":"ci","status":"completed","conclusion":"success"}]}`)
		default:
			http.NotFound(w, r)
		}
	})

	details, err := client.GetPRDetails(context.Background(), "https://git.internal.example.com/acme/app/pull/12")
	require.NoError(t, err)
	require.Equal(t, PRStateOpen, details.State)
	require.True(t, details.Pollable())
	require.Len(t, details.Comments, 1)
	require.Equal(t, "please fix", details.Comments[0].Body)
	require.Len(t, details.CIChecks, 1)
	require.Equal(t, "ci", details.CIChecks[0].Name)
	require.Equal(t, int64(99), details.CIChecks[0].CheckRunID)
}
