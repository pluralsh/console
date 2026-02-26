package api

import (
	"context"

	gitlab2 "github.com/pluralsh/kubernetes-agent/pkg/gitlab"
)

const (
	AllowedAgentsApiPath = "/api/v4/job/allowed_agents"
)

func GetAllowedAgentsForJob(ctx context.Context, client gitlab2.ClientInterface, jobToken string, opts ...gitlab2.DoOption) (*AllowedAgentsForJob, error) {
	aa := &AllowedAgentsForJob{}
	err := client.Do(ctx,
		joinOpts(opts,
			gitlab2.WithPath(AllowedAgentsApiPath),
			gitlab2.WithJobToken(jobToken),
			gitlab2.WithResponseHandler(gitlab2.ProtoJsonResponseHandler(aa)),
		)...,
	)
	if err != nil {
		return nil, err
	}
	return aa, nil
}
