package websocket

import (
	"fmt"

	graphql "github.com/hasura/go-graphql-client"
	"github.com/hasura/go-graphql-client/pkg/jsonutil"
	"k8s.io/klog/v2"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

// StatusSocket streams the status of a single agent run.
type StatusSocket interface {
	Join() error
	Close() error
	Connected() bool
}

// NewAgentRunStatus creates a closed socket that, once joined, subscribes to agentRunDelta for
// runID and hands every pushed status to onStatus.
func NewAgentRunStatus(runID, consoleURL, deployToken string, onStatus func(*console.AgentRunStatusFragment)) (StatusSocket, error) {
	s, err := newSocketFromConsoleURL(runID, consoleURL, deployToken, true)
	if err != nil {
		return nil, err
	}

	s.subscribe = func(client *graphql.SubscriptionClient, gen uint64) error {
		variables := map[string]any{"id": graphql.ID(runID)}
		if _, err := client.Subscribe(&agentRunDeltaSubscription{}, variables, s.agentRunHandler(gen, onStatus)); err != nil {
			return fmt.Errorf("failed to subscribe to agent run deltas: %w", err)
		}
		return nil
	}
	return s, nil
}

func (s *socket) agentRunHandler(gen uint64, onStatus func(*console.AgentRunStatusFragment)) func([]byte, error) error {
	return func(message []byte, subscribeErr error) error {
		if subscribeErr != nil {
			klog.V(log.LogLevelDefault).InfoS("agent run subscription callback error", "error", subscribeErr)
			return nil
		}
		if len(message) == 0 || s.isStaleOrClosed(gen) {
			return nil
		}

		var payload agentRunDeltaSubscription
		if err := jsonutil.UnmarshalGraphQL(message, &payload); err != nil {
			klog.V(log.LogLevelDefault).InfoS("failed to parse agent run delta", "error", err)
			return nil
		}
		if payload.AgentRunDelta.Payload != nil {
			onStatus(payload.AgentRunDelta.Payload)
		}
		return nil
	}
}

type agentRunDeltaSubscription struct {
	AgentRunDelta struct {
		Payload *console.AgentRunStatusFragment `graphql:"payload"`
	} `graphql:"agentRunDelta(id: $id)"`
}
