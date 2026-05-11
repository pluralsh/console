package client

import (
	stderrors "errors"

	gqlclient "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	internalerrors "github.com/pluralsh/deployment-operator/internal/errors"
	"github.com/pluralsh/deployment-operator/pkg/harness/errors"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/stackrun/v1"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

func (c *client) GetStackRunBase(id string) (result *v1.StackRun, err error) {
	stackRun, err := c.consoleClient.GetStackRunBase(c.ctx, id)
	if err != nil && !internalerrors.IsNotFound(err) {
		return nil, err
	}

	if stackRun == nil || stackRun.StackRun == nil {
		return nil, errors.ErrNotFound
	}

	return result.FromStackRunBaseFragment(stackRun.StackRun), nil
}

func (c *client) AddStackRunLogs(id, logs string) error {
	if _, err := c.consoleClient.AddStackRunLogs(c.ctx, id, gqlclient.RunLogAttributes{
		Logs: logs,
	}); err != nil {
		return err
	}

	klog.V(log.LogLevelExtended).InfoS("updated logs", "id", id)
	return nil
}

func (c *client) CompleteStackRun(id string, attributes gqlclient.StackRunAttributes) error {
	if _, err := c.consoleClient.CompletesStackRun(c.ctx, id, attributes); err != nil {
		return err
	}

	klog.V(log.LogLevelExtended).InfoS("completed stack run", "id", id, "attributes", attributes)
	return nil
}

func (c *client) UpdateStackRun(id string, attributes gqlclient.StackRunAttributes) error {
	if _, err := c.consoleClient.UpdateStackRun(c.ctx, id, attributes); err != nil {
		return err
	}

	klog.V(log.LogLevelExtended).InfoS("updated stack run", "id", id, "attributes", attributes)
	return nil
}

func (c *client) UpdateStackRunStep(id string, attributes gqlclient.RunStepAttributes) error {
	if _, err := c.consoleClient.UpdateStackRunStep(c.ctx, id, attributes); err != nil {
		return err
	}

	klog.V(log.LogLevelExtended).InfoS("updated stack run step", "id", id, "attributes", attributes)
	return nil
}

func (c *client) GetStackRun(id string) (*gqlclient.StackRunMinimalFragment, error) {
	restore, err := c.consoleClient.GetStackRunMinimal(c.ctx, id)
	if err != nil {
		return nil, err
	}

	return restore.StackRun, nil
}

func (c *client) GetStackRunApprovedAt(id string) (*gqlclient.GetStackRunApprovedAt_StackRun, error) {
	restore, err := c.consoleClient.GetStackRunApprovedAt(c.ctx, id)
	if err != nil {
		return nil, err
	}

	return restore.StackRun, nil
}

func (c *client) ListClusterStackRuns(after *string, first *int64) (*gqlclient.ListClusterMinimalStacks_ClusterStackRuns, error) {
	resp, err := c.consoleClient.ListClusterMinimalStacks(c.ctx, after, first, nil, nil)
	if err != nil {
		return nil, err
	}
	if resp.ClusterStackRuns == nil {
		return nil, stderrors.New("the response from ListClusterStackIds is nil")
	}
	return resp.ClusterStackRuns, nil
}
