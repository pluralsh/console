package credentials

import (
	"context"

	cmap "github.com/orcaman/concurrent-map/v2"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func FakeNamespaceCredentialsCache(client client.Client) NamespaceCredentialsCache {
	return &namespaceCredentialsCache{
		cache:               cmap.New[NamespaceCredentials](),
		ctx:                 context.Background(),
		client:              client,
		defaultConsoleToken: "",
	}
}
