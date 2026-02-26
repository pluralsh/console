package plural

import (
	"context"

	"github.com/pluralsh/kubernetes-agent/pkg/api"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/uuid"
)

func GetAgentInfo(ctx context.Context, agentToken api.AgentToken, pluralURL string) (*api.AgentInfo, error) {
	client := New(pluralURL, string(agentToken))
	cluster, err := client.Console.MyCluster(ctx)
	if err != nil {
		return nil, err
	}

	u, err := uuid.ToInt64(cluster.MyCluster.ID)
	if err != nil {
		return nil, err
	}

	return &api.AgentInfo{
		Id:        u,
		ClusterId: cluster.MyCluster.ID,
		Name:      cluster.MyCluster.Name,
	}, nil
}
