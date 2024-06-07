package client

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console-client-go"
)

func (c *client) UpdateDeploymentSettings(ctx context.Context, attr console.DeploymentSettingsAttributes) (*console.UpdateDeploymentSettings, error) {
	resp, err := c.consoleClient.UpdateDeploymentSettings(ctx, attr)
	if err != nil {
		return nil, err
	}
	if resp == nil {
		return nil, fmt.Errorf("returned UpdateDeploymentSettings are nil")
	}

	return resp, nil
}

func (c *client) GetDeploymentSettings(ctx context.Context) (*console.DeploymentSettingsFragment, error) {
	resp, err := c.consoleClient.GetDeploymentSettings(ctx)
	if err != nil {
		return nil, err
	}
	if resp == nil {
		return nil, fmt.Errorf("returned GetDeploymentSettings object is nil")
	}
	return resp.DeploymentSettings, nil
}
