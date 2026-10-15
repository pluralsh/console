package agentrun

import (
	"errors"
	"testing"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/test/mocks"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestFailAgentRun(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("UpdateAgentRun", mock.Anything, "run-1", mock.MatchedBy(func(attrs gqlclient.AgentRunStatusAttributes) bool {
		return attrs.Status == gqlclient.AgentRunStatusFailed &&
			attrs.Error != nil &&
			*attrs.Error == "agent run failed: boom"
	})).Return(&gqlclient.AgentRunFragment{ID: "run-1"}, nil).Once()

	require.NoError(t, FailAgentRun(m, "run-1", "agent run failed: boom", nil))
}

func TestFailAgentRunPropagatesUpdateError(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("UpdateAgentRun", mock.Anything, "run-1", mock.Anything).
		Return((*gqlclient.AgentRunFragment)(nil), errors.New("console unavailable")).
		Once()

	err := FailAgentRun(m, "run-1", "agent run failed: boom", nil)
	require.ErrorContains(t, err, "console unavailable")
}
