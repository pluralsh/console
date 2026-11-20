package websocket

import (
	"testing"

	graphql "github.com/hasura/go-graphql-client"
	console "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/require"
)

func TestAgentRunDeltaSubscriptionSelectsStatusFields(t *testing.T) {
	query, _, err := graphql.ConstructSubscription(&agentRunDeltaSubscription{}, map[string]any{"id": graphql.ID("run-id")})
	require.NoError(t, err)
	require.Equal(t, "subscription ($id:ID!){agentRunDelta(id: $id){payload{id,status,approvedAt,headBranch,prompts{id,seq}}}}", query)
}

func TestAgentRunHandlerDeliversPayload(t *testing.T) {
	s := newSocket("run-id", mustWebsocketURL(t), "token", false)
	gen := s.clientGen.Add(1)

	var got *console.AgentRunStatusFragment
	handler := s.agentRunHandler(gen, func(run *console.AgentRunStatusFragment) { got = run })
	require.NoError(t, handler([]byte(`{"agentRunDelta":{"payload":{"id":"run-id","status":"CANCELLED","prompts":[{"id":"p","seq":2}]}}}`), nil))
	require.NotNil(t, got)
	require.Equal(t, console.AgentRunStatusCancelled, got.Status)
	require.Len(t, got.Prompts, 1)
	require.Equal(t, int64(2), got.Prompts[0].Seq)

	got = nil
	require.NoError(t, handler([]byte(`{"agentRunDelta":{"payload":{"id":"run-id","status":"RUNNING"}}}`), nil))
	require.NotNil(t, got)

	got = nil
	require.NoError(t, s.Close())
	require.NoError(t, handler([]byte(`{"agentRunDelta":{"payload":{"id":"run-id","status":"RUNNING"}}}`), nil))
	require.Nil(t, got, "closed sockets must not deliver")
}
