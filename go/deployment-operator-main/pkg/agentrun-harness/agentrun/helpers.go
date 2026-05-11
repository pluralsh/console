package agentrun

import (
	"context"

	gqlclient "github.com/pluralsh/console/go/client"

	console "github.com/pluralsh/deployment-operator/pkg/client"
)

func StartAgentRun(client console.Client, id string) error {
	_, err := client.UpdateAgentRun(context.Background(), id, gqlclient.AgentRunStatusAttributes{Status: gqlclient.AgentRunStatusRunning})
	return err
}

func FailAgentRun(client console.Client, id string, errorMsg string) error {
	_, err := client.UpdateAgentRun(context.Background(), id, gqlclient.AgentRunStatusAttributes{
		Status: gqlclient.AgentRunStatusFailed,
		Error:  &errorMsg,
	})
	return err
}
