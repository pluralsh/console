package controller

import (
	"context"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	gqlclient "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/console/go/deployment-operator/pkg/scm"
	"github.com/pluralsh/console/go/deployment-operator/pkg/test/mocks"
)

func TestMain(m *testing.M) {
	prev := analysisPersistPollDelay
	analysisPersistPollDelay = 5 * time.Millisecond
	code := m.Run()
	analysisPersistPollDelay = prev
	os.Exit(code)
}

func TestAnalysisPersisted(t *testing.T) {
	t.Parallel()
	t.Run("nil fragment", func(t *testing.T) {
		t.Parallel()
		require.False(t, analysisPersisted(nil))
	})
	t.Run("nil analysis", func(t *testing.T) {
		t.Parallel()
		require.False(t, analysisPersisted(&gqlclient.AgentRunFragment{ID: "x"}))
	})
	t.Run("empty fields", func(t *testing.T) {
		t.Parallel()
		require.False(t, analysisPersisted(&gqlclient.AgentRunFragment{
			Analysis: &gqlclient.AgentAnalysisFragment{Summary: " ", Analysis: "\t"},
		}))
	})
	t.Run("populated", func(t *testing.T) {
		t.Parallel()
		require.True(t, analysisPersisted(&gqlclient.AgentRunFragment{
			Analysis: &gqlclient.AgentAnalysisFragment{Summary: "s", Analysis: "body"},
		}))
	})
}

func TestBuildAnalysisFollowUpPrompt(t *testing.T) {
	t.Parallel()
	p := buildAnalysisFollowUpPrompt(2)
	require.Contains(t, p, "follow-up 2/3")
	require.Contains(t, p, "updateAgentRunAnalysis")
}

type recordingTool struct {
	analysisFollowUps int
	followErr         error
}

func (t *recordingTool) Run(context.Context, ...exec.Option) {}

func (t *recordingTool) BabysitRun(context.Context, *toolv1.BabysitContext) bool { return false }

func (t *recordingTool) ConfigureBabysitRun() error { return nil }

func (t *recordingTool) Configure(_, _ string) error { return nil }

func (t *recordingTool) OnMessage(func(*gqlclient.AgentMessageAttributes)) {}

func (t *recordingTool) FollowUpRun(context.Context, string) error {
	t.analysisFollowUps++
	return t.followErr
}

func (t *recordingTool) UploadArtifacts(context.Context) (*artifacts.UploadArtifacts, error) {
	return nil, nil
}

type fakeBabysitGRPCClient struct {
	details map[string]*scm.PRDetails
}

func (f *fakeBabysitGRPCClient) GetPRDetails(_ context.Context, prURL string) (*scm.PRDetails, error) {
	details, ok := f.details[prURL]
	if !ok {
		return nil, fmt.Errorf("missing details for %s", prURL)
	}

	return details, nil
}

func (f *fakeBabysitGRPCClient) GetPRSummary(ctx context.Context, prURL string) (*scm.PRDetails, error) {
	return f.GetPRDetails(ctx, prURL)
}

func (f *fakeBabysitGRPCClient) Close() error { return nil }

func TestRequeuePendingInitialRunError(t *testing.T) {
	t.Parallel()
	ch := make(chan error, 1)
	ch <- errors.New("initial failed")
	in := &agentRunController{errChan: ch}
	require.True(t, in.requeuePendingInitialRunError())
	got := <-ch
	require.EqualError(t, got, "initial failed")
}

func TestAnalysisGateEnabled(t *testing.T) {
	t.Parallel()
	require.True(t, analysisGateEnabled(gqlclient.AgentRunModeAnalyze))
	require.True(t, analysisGateEnabled(gqlclient.AgentRunModeWrite))
}

func TestEnsureAnalysisPersistedAfterInitialRun_runsInWriteMode(t *testing.T) {
	t.Parallel()
	m := mocks.NewClientMock(t)
	full := &gqlclient.AgentRunFragment{
		ID: "r1",
		Analysis: &gqlclient.AgentAnalysisFragment{
			Summary:  "sum",
			Analysis: "details",
		},
	}
	m.On("GetAgentRun", mock.Anything, "r1").Return(full, nil).Once()

	in := &agentRunController{
		consoleClient: m,
		agentRun:      &agentrunv1.AgentRun{Mode: gqlclient.AgentRunModeWrite},
		agentRunID:    "r1",
		errChan:       make(chan error, 1),
		tool:          &recordingTool{},
	}
	in.ensureAnalysisPersistedAfterInitialRun(context.Background())
	m.AssertExpectations(t)
}

func TestEnsureAnalysisPersistedAfterInitialRun_skipsWhenInitialErrQueued(t *testing.T) {
	t.Parallel()
	m := mocks.NewClientMock(t)
	ch := make(chan error, 1)
	ch <- errors.New("cli")
	rt := &recordingTool{}
	in := &agentRunController{
		consoleClient: m,
		agentRun:      &agentrunv1.AgentRun{Mode: gqlclient.AgentRunModeAnalyze},
		errChan:       ch,
		tool:          rt,
	}
	in.ensureAnalysisPersistedAfterInitialRun(context.Background())
	m.AssertNotCalled(t, "GetAgentRun")
	require.Equal(t, 0, rt.analysisFollowUps)
	require.EqualError(t, <-ch, "cli")
}

func TestEnsureAnalysisPersistedAfterInitialRun_oneFollowUpThenSatisfied(t *testing.T) {
	t.Parallel()
	m := mocks.NewClientMock(t)
	empty := &gqlclient.AgentRunFragment{ID: "r1", Analysis: nil}
	full := &gqlclient.AgentRunFragment{
		ID: "r1",
		Analysis: &gqlclient.AgentAnalysisFragment{
			Summary:  "sum",
			Analysis: "details",
		},
	}
	m.On("GetAgentRun", mock.Anything, "r1").Return(empty, nil).Once()
	m.On("GetAgentRun", mock.Anything, "r1").Return(full, nil).Once()

	rt := &recordingTool{}
	in := &agentRunController{
		consoleClient: m,
		agentRun:      &agentrunv1.AgentRun{Mode: gqlclient.AgentRunModeAnalyze},
		agentRunID:    "r1",
		errChan:       make(chan error, 1),
		tool:          rt,
	}
	in.ensureAnalysisPersistedAfterInitialRun(context.Background())
	require.Equal(t, 1, rt.analysisFollowUps)
	select {
	case e := <-in.errChan:
		t.Fatalf("unexpected error: %v", e)
	default:
	}
	m.AssertExpectations(t)
}

func TestEnsureAnalysisPersistedAfterInitialRun_exhaustsFollowUps(t *testing.T) {
	t.Parallel()
	m := mocks.NewClientMock(t)
	empty := &gqlclient.AgentRunFragment{ID: "r1", Analysis: nil}
	for range maxAnalysisFollowUps + 1 {
		m.On("GetAgentRun", mock.Anything, "r1").Return(empty, nil).Once()
	}
	rt := &recordingTool{}
	in := &agentRunController{
		consoleClient: m,
		agentRun:      &agentrunv1.AgentRun{Mode: gqlclient.AgentRunModeAnalyze},
		agentRunID:    "r1",
		errChan:       make(chan error, 1),
		tool:          rt,
	}
	in.ensureAnalysisPersistedAfterInitialRun(context.Background())
	require.Equal(t, maxAnalysisFollowUps, rt.analysisFollowUps)
	err := <-in.errChan
	require.ErrorContains(t, err, "updateAgentRunAnalysis")
	m.AssertExpectations(t)
}

func TestEnsureAnalysisPersistedAfterInitialRun_followUpError(t *testing.T) {
	t.Parallel()
	m := mocks.NewClientMock(t)
	empty := &gqlclient.AgentRunFragment{ID: "r1", Analysis: nil}
	m.On("GetAgentRun", mock.Anything, "r1").Return(empty, nil).Once()
	rt := &recordingTool{followErr: fmt.Errorf("codex crashed")}
	in := &agentRunController{
		consoleClient: m,
		agentRun:      &agentrunv1.AgentRun{Mode: gqlclient.AgentRunModeAnalyze},
		agentRunID:    "r1",
		errChan:       make(chan error, 1),
		tool:          rt,
	}
	in.ensureAnalysisPersistedAfterInitialRun(context.Background())
	require.Equal(t, 1, rt.analysisFollowUps)
	require.EqualError(t, <-in.errChan, "codex crashed")
}

func TestBuildBabysitContextBaselinesAndSkipsUnchanged(t *testing.T) {
	t.Parallel()

	prURL := "https://github.com/pluralsh/console/pull/1"
	in := &agentRunController{dir: t.TempDir()}
	agentRun := &gqlclient.AgentRunFragment{
		PullRequests: []*gqlclient.PullRequestFragment{{URL: prURL}},
	}
	client := &fakeBabysitGRPCClient{
		details: map[string]*scm.PRDetails{
			prURL: {
				Title:   "Fix babysit",
				HeadRef: "fix/babysit",
				State:   scm.PRStateOpen,
				Comments: []scm.PRComment{{
					ID:        "1",
					Type:      scm.PRCommentTypeIssue,
					Author:    "reviewer",
					Body:      "existing comment",
					CreatedAt: time.Unix(10, 0),
				}},
			},
		},
	}

	require.Nil(t, in.buildBabysitContext(context.Background(), agentRun, client))
	require.NotEmpty(t, in.lastPRSHA)
	require.Nil(t, in.buildBabysitContext(context.Background(), agentRun, client))
}

func TestBuildBabysitContextIncludesDelayedNewComments(t *testing.T) {
	t.Parallel()

	prURL := "https://github.com/pluralsh/console/pull/1"
	in := &agentRunController{dir: t.TempDir()}
	agentRun := &gqlclient.AgentRunFragment{
		PullRequests: []*gqlclient.PullRequestFragment{{URL: prURL}},
	}
	client := &fakeBabysitGRPCClient{
		details: map[string]*scm.PRDetails{
			prURL: {
				Title:   "Fix babysit",
				HeadRef: "fix/babysit",
				State:   scm.PRStateOpen,
				Comments: []scm.PRComment{{
					ID:        "1",
					Type:      scm.PRCommentTypeIssue,
					Author:    "reviewer",
					Body:      "existing comment",
					CreatedAt: time.Unix(10, 0),
				}},
			},
		},
	}

	require.Nil(t, in.buildBabysitContext(context.Background(), agentRun, client))
	createdBeforeBaseline := in.lastPRCheckAt.Add(-time.Hour)

	client.details[prURL] = &scm.PRDetails{
		Title:   "Fix babysit",
		HeadRef: "fix/babysit",
		State:   scm.PRStateOpen,
		Comments: []scm.PRComment{
			{
				ID:        "1",
				Type:      scm.PRCommentTypeIssue,
				Author:    "reviewer",
				Body:      "existing comment",
				CreatedAt: time.Unix(10, 0),
			},
			{
				ID:        "2",
				Type:      scm.PRCommentTypeReview,
				Author:    "reviewer",
				Body:      "late visible comment",
				CreatedAt: createdBeforeBaseline,
			},
		},
	}

	bCtx := in.buildBabysitContext(context.Background(), agentRun, client)
	require.NotNil(t, bCtx)
	require.Len(t, bCtx.PRs, 1)
	require.Len(t, bCtx.PRs[0].NewComments, 1)
	require.Equal(t, "late visible comment", bCtx.PRs[0].NewComments[0].Body)
	require.Contains(t, bCtx.Prompt, "late visible comment")
	require.Contains(t, bCtx.Prompt, "review:2")
}
