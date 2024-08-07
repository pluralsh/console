package client

import (
	console "github.com/pluralsh/console/go/client"
)

func (c *client) GetServiceContext(name string) (*console.ServiceContextFragment, error) {
	response, err := c.consoleClient.GetServiceContext(c.ctx, name)
	if err != nil {
		return nil, err
	}

	return response.ServiceContext, nil
}
