package client

import (
	stderrors "errors"

	console "github.com/pluralsh/console/go/client"
)

func (c *client) ListClusterSentinelRunJobs(after *string, first *int64) (*console.ListClusterSentinelRunJobs_ClusterSentinelRunJobs, error) {
	resp, err := c.consoleClient.ListClusterSentinelRunJobs(c.ctx, after, first, nil, nil)
	if err != nil {
		return nil, err
	}
	if resp.ClusterSentinelRunJobs == nil {
		return nil, stderrors.New("the response from ListClusterSentinelRunJobs is nil")
	}
	return resp.ClusterSentinelRunJobs, nil
}

func (c *client) GetSentinelRunJob(id string) (*console.SentinelRunJobFragment, error) {
	resp, err := c.consoleClient.GetSentinelRunJob(c.ctx, id)
	if err != nil {
		return nil, err
	}
	return resp.SentinelRunJob, nil
}

func (c *client) UpdateSentinelRunJobStatus(id string, attr *console.SentinelRunJobUpdateAttributes) error {
	_, err := c.consoleClient.UpdateSentinelRunJobStatus(c.ctx, id, attr)
	if err != nil {
		return err
	}
	return nil
}
