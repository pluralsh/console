package agentrun

import (
	"context"

	gqlclient "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/usage"
	console "github.com/pluralsh/console/go/deployment-operator/pkg/client"
)

func StartAgentRun(client console.Client, id string, u *usage.Usage) error {
	_, err := client.UpdateAgentRun(context.Background(), id, withUsage(gqlclient.AgentRunStatusAttributes{Status: gqlclient.AgentRunStatusRunning}, u))
	return err
}

func MarkAgentRunPendingApproval(ctx context.Context, client console.Client, id string, u *usage.Usage) error {
	_, err := client.UpdateAgentRun(ctx, id, withUsage(gqlclient.AgentRunStatusAttributes{Status: gqlclient.AgentRunStatusPendingApproval}, u))
	return err
}

func FailAgentRun(client console.Client, id string, errorMsg string, u *usage.Usage) error {
	_, err := client.UpdateAgentRun(context.Background(), id, withUsage(gqlclient.AgentRunStatusAttributes{
		Status: gqlclient.AgentRunStatusFailed,
		Error:  &errorMsg,
	}, u))
	return err
}

func RestartAgentRun(client console.Client, id string, u *usage.Usage) error {
	_, err := client.UpdateAgentRun(context.Background(), id, withUsage(gqlclient.AgentRunStatusAttributes{
		Status:   gqlclient.AgentRunStatusPending,
		Messages: nil, // clear messages
		Error:    nil, // clear error
	}, u))
	return err
}

func withUsage(attrs gqlclient.AgentRunStatusAttributes, u *usage.Usage) gqlclient.AgentRunStatusAttributes {
	if u != nil {
		attrs.Usage = u.Attributes()
	}
	return attrs
}
