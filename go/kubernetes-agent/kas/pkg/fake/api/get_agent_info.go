package api

import (
	"context"

	"github.com/pluralsh/kubernetes-agent/pkg/api"
	"github.com/pluralsh/kubernetes-agent/pkg/gitlab"
)

func GetAgentInfo(ctx context.Context, agentToken api.AgentToken, opts ...gitlab.DoOption) (*api.AgentInfo, error) {
	return &api.AgentInfo{
		Id:   123456,
		Name: "fake-agent",
	}, nil
}
