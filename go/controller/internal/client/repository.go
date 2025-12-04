package client

import (
	console "github.com/pluralsh/console/go/client"
	internalerror "github.com/pluralsh/console/go/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
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

func (c *client) CreateGitRepository(attrs console.GitAttributes) (*console.CreateGitRepository, error) {
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

func (c *client) GetRepositoryID(url string) (string, error) {
	response, err := c.consoleClient.GetGitRepositoryID(c.ctx, &url)
	if internalerror.IsNotFound(err) {
		return "", errors.NewNotFound(schema.GroupResource{}, url)
	}
	if err == nil && (response == nil || response.GitRepository == nil) {
		return "", errors.NewNotFound(schema.GroupResource{}, url)
	}
	if response == nil {
		return "", err
	}
	return response.GitRepository.ID, err
}
