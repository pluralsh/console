package scm

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
	gogitlab "gitlab.com/gitlab-org/api/client-go"
)

func TestGitLabGetPRSummaryPollability(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		state    string
		want     PRState
		pollable bool
	}{
		{name: "opened", state: "opened", want: PRStateOpen, pollable: true},
		{name: "merged", state: "merged", want: PRStateMerged, pollable: false},
		{name: "closed", state: "closed", want: PRStateClosed, pollable: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				require.Equal(t, "/api/v4/projects/group/project/merge_requests/9", r.URL.Path)
				_, _ = fmt.Fprintf(w, `{"title":"Fix","description":"n","state":%q,"source_branch":"feat/x"}`, tt.state)
			}))
			t.Cleanup(server.Close)

			gl, err := gogitlab.NewClient("token", gogitlab.WithBaseURL(server.URL+"/"), gogitlab.WithHTTPClient(server.Client()))
			require.NoError(t, err)
			client := &gitLabClient{gl: gl}

			details, err := client.GetPRSummary(context.Background(), "https://git.internal.example.com/group/project/-/merge_requests/9")
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
