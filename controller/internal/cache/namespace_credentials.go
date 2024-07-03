package cache

import (
	"context"
	"fmt"

	cmap "github.com/orcaman/concurrent-map/v2"
	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/controller"
	"github.com/pluralsh/console/controller/internal/utils"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type NamespaceCredentialsCache interface {
	Init() error
	Wipe()
	Reset() error
	AddNamespaceCredentials(nc *v1alpha1.NamespaceCredentials)
	GetNamespaceCredentials(namespace string) NamespaceCredentials
	GetNamespaceToken(namespace string) (string, error)
}

func NewNamespaceCredentialsCache(client client.Client, defaultConsoleToken string) NamespaceCredentialsCache {
	return &namespaceCredentialsCache{
		cache:               cmap.New[NamespaceCredentials](),
		ctx:                 context.Background(),
		client:              client,
		defaultConsoleToken: defaultConsoleToken,
	}
}

type namespaceCredentialsCache struct {
	cache               cmap.ConcurrentMap[string, NamespaceCredentials]
	ctx                 context.Context
	client              client.Client
	defaultConsoleToken string
}

func (in *namespaceCredentialsCache) Init() error {
	list := new(v1alpha1.NamespaceCredentialsList)
	if err := in.client.List(in.ctx, list); err != nil {
		return fmt.Errorf("could not list NamespaceCredentials: %s", err)
	}

	for _, nc := range list.Items {
		in.AddNamespaceCredentials(&nc)
	}

	return nil
}

func (in *namespaceCredentialsCache) Wipe() {
	in.cache.Clear()
}

func (in *namespaceCredentialsCache) Reset() error {
	in.Wipe()
	return in.Init()
}

func (in *namespaceCredentialsCache) AddNamespaceCredentials(namespaceCredentials *v1alpha1.NamespaceCredentials) {
	token, err := in.getNamespaceCredentialsToken(namespaceCredentials)
	for _, namespace := range namespaceCredentials.Spec.Namespaces {
		in.cache.Set(namespace, NamespaceCredentials{
			namespaceCredentials: &namespaceCredentials.Name,
			token:                token,
			err:                  err,
		})
	}
}

func (in *namespaceCredentialsCache) getNamespaceCredentialsToken(nc *v1alpha1.NamespaceCredentials) (string, error) {
	secret, err := utils.GetSecret(in.ctx, in.client, &nc.Spec.SecretRef)
	if err != nil {
		return "", fmt.Errorf("failed to get secret: %s", err)
	}

	token, ok := secret.StringData[controller.CredentialsSecretTokenKey]
	if !ok {
		return "", fmt.Errorf("did not found %s data in a secret", controller.CredentialsSecretTokenKey)
	}

	return token, nil
}

func (in *namespaceCredentialsCache) GetNamespaceCredentials(namespace string) NamespaceCredentials {
	if nc, ok := in.cache.Get(namespace); ok {
		return nc
	}

	return NamespaceCredentials{token: in.defaultConsoleToken}
}

func (in *namespaceCredentialsCache) GetNamespaceToken(namespace string) (string, error) {
	nc := in.GetNamespaceCredentials(namespace)
	return nc.token, nc.err
}

type NamespaceCredentials struct {
	// namespaceCredentials is the name of NamespaceCredentials object for this namespace.
	namespaceCredentials *string

	// token that controllers should use when reconciling objects from this namespace.
	token string

	// err stores error that may occur while reading credentials for this namespace.
	err error
}
