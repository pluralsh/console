package cache

import (
	cmap "github.com/orcaman/concurrent-map/v2"
)

type NamespaceCredentialsCache interface {
	SetNamespaceCredentials(namespaces []string, token, namespaceCredentials string, err error)
	GetNamespaceCredentials(namespace string) NamespaceCredentials
	GetNamespaceToken(namespace string) (string, error)
	Wipe()
}

func NewNamespaceCredentialsCache(defaultConsoleToken string) NamespaceCredentialsCache {
	return &namespaceCredentialsCache{
		cache:               cmap.New[NamespaceCredentials](),
		defaultConsoleToken: defaultConsoleToken,
	}
}

type namespaceCredentialsCache struct {
	cache               cmap.ConcurrentMap[string, NamespaceCredentials]
	defaultConsoleToken string
}

func (in *namespaceCredentialsCache) SetNamespaceCredentials(namespaces []string, token, namespaceCredentials string, err error) {
	for _, namespace := range namespaces {
		in.cache.Set(namespace, NamespaceCredentials{
			namespaceCredentials: &namespaceCredentials,
			token:                token,
			err:                  err,
		})
	}
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

func (in *namespaceCredentialsCache) Wipe() {
	in.cache.Clear()
}

type NamespaceCredentials struct {
	// namespaceCredentials is the name of NamespaceCredentials object for this namespace.
	namespaceCredentials *string

	// token that controllers should use when reconciling objects from this namespace.
	token string

	// err stores error that may occur while reading credentials for this namespace.
	err error
}
