package common

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/plural"
)

// ResolveAgentRuntimeID resolves an AgentRuntimeRef (cluster handle + runtime name) to a Console agent runtime ID.
// It looks up the cluster ID from the handle via the plural cache, then fetches the agent runtime by name and cluster ID.
// Callers can use this from any controller; on error they may choose to requeue (e.g. with Wait() for not-ready refs).
func ResolveAgentRuntimeID(ctx context.Context, c client.ConsoleClient, ref *v1alpha1.AgentRuntimeRef) (*string, error) {
	if ref == nil {
		return nil, nil
	}

	clusterID, err := plural.Cache().GetClusterID(ref.Cluster)
	if err != nil {
		return nil, err
	}
	if clusterID == nil {
		return nil, fmt.Errorf("cluster %q has no ID", ref.Cluster)
	}

	agentRuntime, err := c.GetAgentRuntime(ctx, ref.Runtime, *clusterID)
	if err != nil {
		return nil, fmt.Errorf("agent runtime %q not found on cluster %q: %w", ref.Runtime, ref.Cluster, err)
	}

	return &agentRuntime.ID, nil
}
