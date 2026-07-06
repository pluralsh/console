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
	require.Equal(t, PRCommentTypeReviewSummary, comments[2].Type)
	require.Equal(t, "bot-reviewer", comments[2].Author)
	require.Equal(t, "summary review feedback", comments[2].Body)
	require.False(t, comments[2].Reactable())
}
