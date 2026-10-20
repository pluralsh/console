package main

import (
	"context"
	"errors"
	"testing"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/test/mocks"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestMarkAgentRunFailed(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("UpdateAgentRun", mock.Anything, "run-1", mock.MatchedBy(func(attrs gqlclient.AgentRunStatusAttributes) bool {
		return attrs.Status == gqlclient.AgentRunStatusFailed &&
			attrs.Error != nil &&
			*attrs.Error == "bootstrap exploded"
	})).Return(&gqlclient.AgentRunFragment{ID: "run-1"}, nil).Once()

	markAgentRunFailed(m, "run-1", "bootstrap exploded")
}

func TestMarkAgentRunFailedLogsUpdateError(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("UpdateAgentRun", mock.Anything, "run-1", mock.Anything).
		Return((*gqlclient.AgentRunFragment)(nil), errors.New("console unavailable")).
		Once()

	// Should not panic when Console rejects the update.
	markAgentRunFailed(m, "run-1", "bootstrap exploded")
}

func TestRunReturnsFetchError(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("GetAgentRun", mock.Anything, "run-1").
		Return((*gqlclient.AgentRunFragment)(nil), errors.New("not found")).
		Once()

	err := run(context.Background(), m, "run-1", t.TempDir())
	require.Error(t, err)
	require.Contains(t, err.Error(), "could not fetch agent run (run-1)")
	require.Contains(t, err.Error(), "not found")
}

func TestRunReturnsCredentialsFetchError(t *testing.T) {
	t.Parallel()

	m := mocks.NewClientMock(t)
	m.On("GetAgentRun", mock.Anything, "run-1").
		Return(&gqlclient.AgentRunFragment{ID: "run-1"}, nil).
		Once()
	m.On("GetAgentRunCredentials", mock.Anything, "run-1").
		Return((*gqlclient.AgentRunCredentialsFragment)(nil), errors.New("forbidden")).
		Once()

	err := run(context.Background(), m, "run-1", t.TempDir())
	require.Error(t, err)
	require.Contains(t, err.Error(), "could not fetch agent run credentials (run-1)")
	require.Contains(t, err.Error(), "forbidden")
}
