package credentials

import (
	"context"
	"fmt"

	cmap "github.com/orcaman/concurrent-map/v2"
	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/log"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/config"
)

const (
	CredentialsSecretTokenKey = "token"
)

type NamespaceCredentialsCache interface {
	Init() error
	Wipe()
	Reset() error
	AddNamespaceCredentials(nc *v1alpha1.NamespaceCredentials) error
	RemoveNamespaceCredentials(nc *v1alpha1.NamespaceCredentials)
	GetNamespaceCredentials(namespace string) NamespaceCredentials
	GetNamespaceToken(namespace string) (string, error)
}

func NewNamespaceCredentialsCache(defaultConsoleToken string, scheme *runtime.Scheme) (NamespaceCredentialsCache, error) {
	c, err := client.New(config.GetConfigOrDie(), client.Options{Scheme: scheme})
	if err != nil {
		return nil, err
	}

	cache := &namespaceCredentialsCache{
		cache:               cmap.New[NamespaceCredentials](),
		ctx:                 context.Background(),
		client:              c,
		defaultConsoleToken: defaultConsoleToken,
	}

	if err = cache.Init(); err != nil {
		return nil, err
	}

	return cache, nil
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
		// Ignore errors during init. These are used in the controller to add them to NamespaceCredentials conditions.
		_ = in.AddNamespaceCredentials(&nc)
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

// AddNamespaceCredentials registers custom namespace credentials.
// Even if errors occur while reading token, namespaces will be registered as ones using custom credentials.
func (in *namespaceCredentialsCache) AddNamespaceCredentials(namespaceCredentials *v1alpha1.NamespaceCredentials) error {
	token, err := in.getNamespaceCredentialsToken(namespaceCredentials)
	for _, namespace := range namespaceCredentials.Spec.Namespaces {
		nc, ok := in.cache.Get(namespace)
		if ok && nc.namespaceCredentials != nil && *nc.namespaceCredentials != namespaceCredentials.Name {
			log.Logger.Warnf("found conflicting credentials for %s namespace: %s and %s",
				namespace, *nc.namespaceCredentials, namespaceCredentials.Name)
		}

		in.cache.Set(namespace, NamespaceCredentials{
			namespaceCredentials: &namespaceCredentials.Name,
			token:                token,
			err:                  err,
		})
	}
	return err
}

func (in *namespaceCredentialsCache) getNamespaceCredentialsToken(nc *v1alpha1.NamespaceCredentials) (string, error) {
	secret := &corev1.Secret{}
	if err := in.client.Get(in.ctx, types.NamespacedName{Name: nc.Spec.SecretRef.Name, Namespace: nc.Spec.SecretRef.Namespace}, secret); err != nil {
		return "", fmt.Errorf("failed to get secret: %s", err)
	}

	token, ok := secret.StringData[CredentialsSecretTokenKey]
	if !ok {
		return "", fmt.Errorf("did not found %s data in a secret", CredentialsSecretTokenKey)
	}

	return token, nil
}

func (in *namespaceCredentialsCache) RemoveNamespaceCredentials(namespaceCredentials *v1alpha1.NamespaceCredentials) {
	for _, namespace := range namespaceCredentials.Spec.Namespaces {
		in.cache.Remove(namespace)
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

type NamespaceCredentials struct {
	// namespaceCredentials is the name of NamespaceCredentials object for this namespace.
	namespaceCredentials *string

	// token that controllers should use when reconciling objects from this namespace.
	token string

	// err stores error that may occur while reading credentials for this namespace.
	err error
}
