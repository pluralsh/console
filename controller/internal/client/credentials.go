package client

import (
	"fmt"

	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/internal/credentials"
)

func (c *client) UseCredentials(namespace string, credentialsCache credentials.NamespaceCredentialsCache) (string, error) {
	nc := credentialsCache.GetNamespaceCredentials(namespace)
	if nc.Err != nil {
		return nc.NamespaceCredentials, fmt.Errorf("cannot use %s namespace credentials, got error: %s", nc.NamespaceCredentials, nc.Err.Error())
	}

	c.consoleClient = console.NewClient(NewHttpClient(nc.Token), c.url, nil)
	return nc.NamespaceCredentials, nil
}
