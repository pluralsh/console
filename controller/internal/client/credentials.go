package client

import (
	"fmt"

	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/internal/cache"
)

func (c *client) UseNamespaceCredentials(namespace string, credentialsCache cache.NamespaceCredentialsCache) error {
	token, err := credentialsCache.GetNamespaceToken(namespace)
	if err != nil {
		return fmt.Errorf("cannot use %s namespace credentials, got error: %s", namespace, err.Error())
	}

	c.consoleClient = console.NewClient(NewHttpClient(token), c.url, nil)
	return nil
}
