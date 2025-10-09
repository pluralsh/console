package client

import (
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/polly/http"
)

func (c *client) UseCredentials(namespace string, credentialsCache credentials.NamespaceCredentialsCache) (string, error) {
	nc := credentialsCache.GetNamespaceCredentials(namespace)
	if nc.Err != nil {
		return nc.NamespaceCredentials, fmt.Errorf("cannot use %s namespace credentials, got error: %s", nc.NamespaceCredentials, nc.Err.Error())
	}

	c.consoleClient = console.NewClient(http.NewHttpClient(nc.Token), c.url, nil)
	return nc.NamespaceCredentials, nil
}
