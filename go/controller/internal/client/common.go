package client

import (
	console "github.com/pluralsh/console/go/client"
)

func (c *client) GetUser(email string) (*console.UserFragment, error) {
	getUser, err := c.consoleClient.GetUser(c.ctx, email)
	if err != nil {
		return nil, err
	}

	return getUser.User, nil
}

func (c *client) GetGroup(name string) (*console.GroupFragment, error) {
	getGroup, err := c.consoleClient.GetGroup(c.ctx, name)
	if err != nil {
		return nil, err
	}

	return getGroup.Group, nil
}
