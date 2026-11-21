package controller

import (
	"context"
	"crypto/x509"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/samber/lo"
	authenticationv1 "k8s.io/api/authentication/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
)

const (
	substrateTokenTTL = time.Hour
	// substrateTokenRefresh is how long before expiry a token is replaced.
	substrateTokenRefresh = 10 * time.Minute
	// substrateCARefresh is how often a cached client re-reads its CA bundle, picking up signer rotation.
	substrateCARefresh = 10 * time.Minute
)

var (
	clusterTrustBundle = schema.GroupKind{Group: "certificates.k8s.io", Kind: "ClusterTrustBundle"}
	// clusterTrustBundleVersions in order of preference: GA from Kubernetes 1.37, beta before.
	clusterTrustBundleVersions = []string{"v1", "v1beta1", "v1alpha1"}
)

// SubstrateClients hands out the Substrate API client a runner is reconciled with.
type SubstrateClients interface {
	For(ctx context.Context, runner *v1alpha1.DevboxRunner) (substrate.API, error)
}

//+kubebuilder:rbac:groups="",resources=serviceaccounts/token,verbs=create
//+kubebuilder:rbac:groups=certificates.k8s.io,resources=clustertrustbundles,verbs=get;list

// ClusterSubstrateClients reaches Substrate with nothing mounted into the operator: it mints ServiceAccount
// tokens for Substrate's audience through the TokenRequest API and verifies ate-api-server against the live
// ClusterTrustBundles of its signer. Clients are cached per address, ServiceAccount and signer, and redialed
// when the CA bundle changes.
type ClusterSubstrateClients struct {
	Client client.Client
	// Reader lists ClusterTrustBundles uncached.
	Reader client.Reader
	// Namespace holds every ServiceAccount tokens are minted for.
	Namespace             string
	DefaultAddress        string
	DefaultServiceAccount string

	mu      sync.Mutex
	clients map[substrateSource]*cachedSubstrateClient
}

type substrateSource struct {
	address        string
	serviceAccount string
	signer         string
}

type cachedSubstrateClient struct {
	client  *substrate.Client
	bundle  string
	checked time.Time
}

func (c *ClusterSubstrateClients) source(runner *v1alpha1.DevboxRunner) substrateSource {
	spec := lo.FromPtr(runner.Spec.Substrate)
	return substrateSource{
		address:        lo.CoalesceOrEmpty(lo.FromPtr(spec.Address), c.DefaultAddress, substrate.DefaultAddress),
		serviceAccount: lo.CoalesceOrEmpty(lo.FromPtr(spec.ServiceAccountName), c.DefaultServiceAccount),
		signer:         lo.CoalesceOrEmpty(lo.FromPtr(spec.CASignerName), servicednsSigner),
	}
}

func (c *ClusterSubstrateClients) For(ctx context.Context, runner *v1alpha1.DevboxRunner) (substrate.API, error) {
	src := c.source(runner)
	if src.serviceAccount == "" {
		return nil, fmt.Errorf("no ServiceAccount to mint Substrate tokens for, set spec.substrate.serviceAccountName")
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	cached := c.clients[src]
	if cached != nil && time.Since(cached.checked) < substrateCARefresh {
		return cached.client, nil
	}

	bundle, err := c.trustBundle(ctx, src.signer)
	if err != nil {
		if cached != nil {
			return cached.client, nil
		}
		return nil, err
	}
	if cached != nil && cached.bundle == bundle {
		cached.checked = time.Now()
		return cached.client, nil
	}

	roots := x509.NewCertPool()
	if !roots.AppendCertsFromPEM([]byte(bundle)) {
		return nil, fmt.Errorf("no certificates in the ClusterTrustBundles of signer %s", src.signer)
	}
	token := &serviceAccountToken{client: c.Client, key: client.ObjectKey{Namespace: c.Namespace, Name: src.serviceAccount}}
	api, err := substrate.DialWith(src.address, "", roots, token)
	if err != nil {
		return nil, fmt.Errorf("dialing Substrate at %s: %w", src.address, err)
	}
	if cached != nil {
		_ = cached.client.Close()
	}
	if c.clients == nil {
		c.clients = map[substrateSource]*cachedSubstrateClient{}
	}
	c.clients[src] = &cachedSubstrateClient{client: api, bundle: bundle, checked: time.Now()}
	return api, nil
}

// trustBundle concatenates the live ClusterTrustBundles of the signer, like a clusterTrustBundle projected volume.
func (c *ClusterSubstrateClients) trustBundle(ctx context.Context, signer string) (string, error) {
	selector := client.MatchingLabels{podcertCanaryingLabel: "live"}
	bundles := map[string]string{}

	// Unstructured, since the vendored k8s.io/api lacks the GA v1 type; the spec is the same in every version.
	mapping, err := c.Client.RESTMapper().RESTMapping(clusterTrustBundle, clusterTrustBundleVersions...)
	if meta.IsNoMatchError(err) {
		return "", fmt.Errorf("certificates.k8s.io doesn't serve ClusterTrustBundles (%s); Substrate needs pod certificates", strings.Join(clusterTrustBundleVersions, ", "))
	}
	if err != nil {
		return "", fmt.Errorf("resolving the ClusterTrustBundle API: %w", err)
	}
	list := &unstructured.UnstructuredList{}
	list.SetGroupVersionKind(mapping.GroupVersionKind.GroupVersion().WithKind("ClusterTrustBundleList"))
	if err := c.Reader.List(ctx, list, selector); err != nil {
		return "", fmt.Errorf("listing ClusterTrustBundles: %w", err)
	}
	for _, b := range list.Items {
		if s, _, _ := unstructured.NestedString(b.Object, "spec", "signerName"); s == signer {
			bundles[b.GetName()], _, _ = unstructured.NestedString(b.Object, "spec", "trustBundle")
		}
	}

	if len(bundles) == 0 {
		return "", fmt.Errorf("no live ClusterTrustBundles for signer %s, is Substrate installed?", signer)
	}
	names := lo.Keys(bundles)
	sort.Strings(names)
	return strings.Join(lo.Map(names, func(n string, _ int) string { return strings.TrimSpace(bundles[n]) }), "\n") + "\n", nil
}

// serviceAccountToken is gRPC credentials holding a TokenRequest token for Substrate's audience, replaced
// shortly before it expires.
type serviceAccountToken struct {
	client client.Client
	key    client.ObjectKey

	mu      sync.Mutex
	token   string
	expires time.Time
}

func (t *serviceAccountToken) GetRequestMetadata(ctx context.Context, _ ...string) (map[string]string, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.token == "" || time.Until(t.expires) < substrateTokenRefresh {
		req := &authenticationv1.TokenRequest{Spec: authenticationv1.TokenRequestSpec{
			Audiences:         []string{substrate.TokenAudience},
			ExpirationSeconds: lo.ToPtr(int64(substrateTokenTTL.Seconds())),
		}}
		sa := &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: t.key.Name, Namespace: t.key.Namespace}}
		if err := t.client.SubResource("token").Create(ctx, sa, req); err != nil {
			return nil, fmt.Errorf("minting a Substrate token for ServiceAccount %s: %w", t.key, err)
		}
		t.token, t.expires = req.Status.Token, req.Status.ExpirationTimestamp.Time
	}
	return map[string]string{"authorization": "Bearer " + t.token}, nil
}

func (*serviceAccountToken) RequireTransportSecurity() bool {
	return true
}
