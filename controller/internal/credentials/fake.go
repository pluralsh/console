package credentials

import (
	"context"

	cmap "github.com/orcaman/concurrent-map/v2"
	k8sclient "sigs.k8s.io/controller-runtime/pkg/client"
)

func FakeNamespaceCredentialsCache(client k8sclient.Client) NamespaceCredentialsCache {
	return &namespaceCredentialsCache{
		cache:               cmap.New[NamespaceCredentials](),
		ctx:                 context.Background(),
		client:              client,
		defaultConsoleToken: "",
	}
}
