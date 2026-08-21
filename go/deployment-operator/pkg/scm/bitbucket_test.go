package scm

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBitBucketCloudGetPRSummaryPollability(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		state    string
		want     PRState
		pollable bool
	}{
		{name: "open", state: "OPEN", want: PRStateOpen, pollable: true},
		{name: "merged", state: "MERGED", want: PRStateMerged, pollable: false},
		{name: "declined", state: "DECLINED", want: PRStateClosed, pollable: false},
		{name: "superseded", state: "SUPERSEDED", want: PRStateClosed, pollable: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				require.Equal(t, "/repositories/acme/app/pullrequests/5", r.URL.Path)
				_, _ = fmt.Fprintf(w, `{
					"title":"Fix",
					"description":"n",
					"state":%q,
					"source":{"branch":{"name":"feat/x"},"commit":{"hash":"abc"}}
				}`, tt.state)
			}))
			t.Cleanup(server.Close)

			client := &bitBucketCloudClient{token: "token", apiBase: server.URL}
			details, err := client.GetPRSummary(context.Background(), "https://bitbucket.org/acme/app/pull-requests/5")
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

func TestBitBucketDCGetPRSummaryPollability(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		state    string
		want     PRState
		pollable bool
	}{
		{name: "open", state: "OPEN", want: PRStateOpen, pollable: true},
		{name: "merged", state: "MERGED", want: PRStateMerged, pollable: false},
		{name: "declined", state: "DECLINED", want: PRStateClosed, pollable: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				require.Equal(t, "/rest/api/1.0/projects/PROJ/repos/app/pull-requests/8", r.URL.Path)
				_, _ = fmt.Fprintf(w, `{
					"title":"Fix",
					"description":"n",
					"state":%q,
					"fromRef":{"displayId":"feat/x","latestCommit":"abc"}
				}`, tt.state)
			}))
			t.Cleanup(server.Close)

			client := &bitBucketDCClient{token: "token", baseURL: server.URL + "/rest"}
			details, err := client.GetPRSummary(context.Background(), "https://bitbucket.internal.example.com/projects/PROJ/repos/app/pull-requests/8")
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
