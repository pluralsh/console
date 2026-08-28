package controller

import (
	"context"
	"testing"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	gqlclient "github.com/pluralsh/console/go/client"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/scm"
	"github.com/pluralsh/console/go/deployment-operator/pkg/test/mocks"
)

func TestResolveBabysitPRURLsPrefersCreatedPR(t *testing.T) {
	t.Parallel()

	created := "https://github.com/pluralsh/console/pull/2"
	followup := "https://github.com/pluralsh/console/pull/1"
	in := &agentRunController{
		agentRun: &agentrunv1.AgentRun{FollowupPrURL: followup},
	}

	urls := in.resolveBabysitPRURLs(&gqlclient.AgentRunFragment{
		FollowupPrURL: &followup,
		PullRequests:  []*gqlclient.PullRequestFragment{{URL: created}},
	})
	require.Equal(t, []string{created}, urls)
	require.Equal(t, []string{created}, in.babysitPRURLs)
}

func TestResolveBabysitPRURLsUsesFollowupWhenNoCreatedPR(t *testing.T) {
	t.Parallel()

	followup := "https://github.com/pluralsh/console/pull/1"
	in := &agentRunController{
		agentRun: &agentrunv1.AgentRun{FollowupPrURL: followup},
	}

	urls := in.resolveBabysitPRURLs(&gqlclient.AgentRunFragment{})
	require.Equal(t, []string{followup}, urls)
}

func TestResolveBabysitPRURLsUsesSideloadedFollowupPrURL(t *testing.T) {
	t.Parallel()

	followup := "https://github.com/pluralsh/console/pull/1"
	in := &agentRunController{}

	urls := in.resolveBabysitPRURLs(&gqlclient.AgentRunFragment{FollowupPrURL: &followup})
	require.Equal(t, []string{followup}, urls)
}

func TestRunBabysitPRStopsWhenFollowupPRMerged(t *testing.T) {
	t.Parallel()

	prURL := "https://github.com/pluralsh/console/pull/1"
	m := mocks.NewClientMock(t)
	m.On("UpdateAgentRun", mock.Anything, "r1", mock.MatchedBy(func(attrs gqlclient.AgentRunStatusAttributes) bool {
		return attrs.Status == gqlclient.AgentRunStatusBabysitting
	})).Return(&gqlclient.AgentRunFragment{ID: "r1", FollowupPrURL: &prURL}, nil).Once()

	in := &agentRunController{
		agentRunID:    "r1",
		consoleClient: m,
		agentRun:      &agentrunv1.AgentRun{FollowupPrURL: prURL},
		newBabysitClient: func() (scm.GRPCClient, error) {
			return &fakeBabysitGRPCClient{
				details: map[string]*scm.PRDetails{
					prURL: {Title: "Follow-up", State: scm.PRStateMerged},
				},
			}, nil
		},
	}

	stop := in.runBabysitPR(context.Background(), func(context.Context, *toolv1.BabysitContext) bool {
		t.Fatal("merged follow-up PR should not reprompt")
		return false
	})
	require.True(t, stop)
}

func TestRunBabysitPRContinuesWhenFollowupPROpen(t *testing.T) {
	t.Parallel()

	prURL := "https://github.com/pluralsh/console/pull/1"
	m := mocks.NewClientMock(t)
	m.On("UpdateAgentRun", mock.Anything, "r1", mock.MatchedBy(func(attrs gqlclient.AgentRunStatusAttributes) bool {
		return attrs.Status == gqlclient.AgentRunStatusBabysitting
	})).Return(&gqlclient.AgentRunFragment{ID: "r1"}, nil).Once()

	in := &agentRunController{
		agentRunID:    "r1",
		consoleClient: m,
		agentRun:      &agentrunv1.AgentRun{FollowupPrURL: prURL},
		dir:           t.TempDir(),
		newBabysitClient: func() (scm.GRPCClient, error) {
			return &fakeBabysitGRPCClient{
				details: map[string]*scm.PRDetails{
					prURL: {Title: "Follow-up", HeadRef: "agent/follow-up", State: scm.PRStateOpen},
				},
			}, nil
		},
	}

	stop := in.runBabysitPR(context.Background(), func(context.Context, *toolv1.BabysitContext) bool {
		t.Fatal("unchanged open PR should only establish a baseline")
		return true
	})
	require.False(t, stop)
	require.NotEmpty(t, in.lastPRSHA)
}

func TestRunBabysitPRUsesCreatedPRURL(t *testing.T) {
	t.Parallel()

	created := "https://github.com/pluralsh/console/pull/2"
	followup := "https://github.com/pluralsh/console/pull/1"
	m := mocks.NewClientMock(t)
	m.On("UpdateAgentRun", mock.Anything, "r1", mock.MatchedBy(func(attrs gqlclient.AgentRunStatusAttributes) bool {
		return attrs.Status == gqlclient.AgentRunStatusBabysitting
	})).Return(&gqlclient.AgentRunFragment{
		ID:            "r1",
		FollowupPrURL: &followup,
		PullRequests:  []*gqlclient.PullRequestFragment{{URL: created}},
	}, nil).Once()

	var polled []string
	in := &agentRunController{
		agentRunID:    "r1",
		consoleClient: m,
		agentRun:      &agentrunv1.AgentRun{FollowupPrURL: followup},
		newBabysitClient: func() (scm.GRPCClient, error) {
			return &recordingBabysitClient{
				fakeBabysitGRPCClient: fakeBabysitGRPCClient{
					details: map[string]*scm.PRDetails{
						created:  {Title: "Created", State: scm.PRStateClosed},
						followup: {Title: "Follow-up", State: scm.PRStateOpen},
					},
				},
				polled: &polled,
			}, nil
		},
	}

	stop := in.runBabysitPR(context.Background(), func(context.Context, *toolv1.BabysitContext) bool {
		t.Fatal("closed created PR should stop babysit")
		return false
	})
	require.True(t, stop)
	require.Equal(t, []string{created}, polled)
}

func TestRunBabysitPRStopsWithoutPRURL(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("UpdateAgentRun", mock.Anything, "r1", mock.Anything).
		Return(&gqlclient.AgentRunFragment{ID: "r1"}, nil).Once()

	in := &agentRunController{
		agentRunID:    "r1",
		consoleClient: m,
		agentRun:      &agentrunv1.AgentRun{},
		newBabysitClient: func() (scm.GRPCClient, error) {
			t.Fatal("should not dial SCM without a PR URL")
			return nil, nil
		},
	}

	require.True(t, in.runBabysitPR(context.Background(), nil))
}

func TestBuildBabysitContextSkipsMergedPRs(t *testing.T) {
	t.Parallel()

	prURL := "https://github.com/pluralsh/console/pull/1"
	in := &agentRunController{dir: t.TempDir()}
	client := &fakeBabysitGRPCClient{
		details: map[string]*scm.PRDetails{
			prURL: {Title: "Done", HeadRef: "feat", State: scm.PRStateMerged},
		},
	}

	require.Nil(t, in.buildBabysitContext(context.Background(), []string{prURL}, client))
	require.Empty(t, in.lastPRSHA)
}

type recordingBabysitClient struct {
	fakeBabysitGRPCClient
	polled *[]string
}

func (c *recordingBabysitClient) GetPRSummary(ctx context.Context, prURL string) (*scm.PRDetails, error) {
	*c.polled = append(*c.polled, prURL)
	return c.fakeBabysitGRPCClient.GetPRSummary(ctx, prURL)
}
