package client

import (
	console "github.com/pluralsh/console-client-go"
)

func (c *client) CreateRepository(url string, privateKey, passphrase, username, password *string) (*console.CreateGitRepository, error) {
	attrs := console.GitAttributes{
		URL:        url,
		PrivateKey: privateKey,
		Passphrase: passphrase,
		Username:   username,
		Password:   password,
	}
	return c.consoleClient.CreateGitRepository(c.ctx, attrs)

}

func (c *client) ListRepositories() (*console.ListGitRepositories, error) {
	return c.consoleClient.ListGitRepositories(c.ctx, nil, nil, nil)
}

func (c *client) UpdateRepository(id string, attrs console.GitAttributes) (*console.UpdateGitRepository, error) {

	return c.consoleClient.UpdateGitRepository(c.ctx, id, attrs)
}

func (c *client) DeleteRepository(id string) error {

	_, err := c.consoleClient.DeleteGitRepository(c.ctx, id)

	return err
}

func (c *client) GetRepository(url *string) (*console.GetGitRepository, error) {

	return c.consoleClient.GetGitRepository(c.ctx, nil, url)
}
