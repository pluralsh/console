package controller

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"testing"
	"time"

	"github.com/samber/lo"
	certificatesv1beta1 "k8s.io/api/certificates/v1beta1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	. "github.com/onsi/gomega"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
)

func testCAPEM(t *testing.T, cn string) string {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	tmpl := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: cn},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		IsCA:                  true,
		BasicConstraintsValid: true,
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	return string(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}))
}

func testTrustBundle(name, signer, pemData string, live bool) *certificatesv1beta1.ClusterTrustBundle {
	b := &certificatesv1beta1.ClusterTrustBundle{
		ObjectMeta: metav1.ObjectMeta{Name: name},
		Spec:       certificatesv1beta1.ClusterTrustBundleSpec{SignerName: signer, TrustBundle: pemData},
	}
	if live {
		b.Labels = map[string]string{podcertCanaryingLabel: "live"}
	}
	return b
}

// servingClusterTrustBundles is a RESTMapper for a cluster serving ClusterTrustBundles at the given versions
// (none if empty) and ServiceAccounts, like the discovery-backed one the operator runs with.
func servingClusterTrustBundles(versions ...string) meta.RESTMapper {
	m := meta.NewDefaultRESTMapper(nil)
	for _, v := range versions {
		m.Add(clusterTrustBundle.WithVersion(v), meta.RESTScopeRoot)
	}
	m.Add(corev1.SchemeGroupVersion.WithKind("ServiceAccount"), meta.RESTScopeNamespace)
	return m
}

func TestClusterSubstrateClientsTrustBundle(t *testing.T) {
	g := NewWithT(t)
	a, b, other := testCAPEM(t, "a"), testCAPEM(t, "b"), testCAPEM(t, "other")
	c := fake.NewClientBuilder().WithScheme(clientgoscheme.Scheme).WithRESTMapper(servingClusterTrustBundles("v1beta1")).WithObjects(
		testTrustBundle("servicedns-b", servicednsSigner, b, true),
		testTrustBundle("servicedns-a", servicednsSigner, a, true),
		testTrustBundle("servicedns-canary", servicednsSigner, testCAPEM(t, "canary"), false),
		testTrustBundle("podidentity", podidentitySigner, other, true),
	).Build()
	clients := &ClusterSubstrateClients{Client: c, Reader: c, Namespace: "plrl-deploy-operator"}

	bundle, err := clients.trustBundle(context.Background(), servicednsSigner)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(bundle).To(Equal(a + b))

	_, err = clients.trustBundle(context.Background(), "missing.example.com/signer")
	g.Expect(err).To(MatchError(ContainSubstring("no live ClusterTrustBundles for signer missing.example.com/signer")))
}

func TestClusterSubstrateClientsTrustBundleVersions(t *testing.T) {
	g := NewWithT(t)
	ca := testCAPEM(t, "ga")
	gv := schema.GroupVersion{Group: "certificates.k8s.io", Version: "v1"}
	ga := &unstructured.Unstructured{}
	ga.SetGroupVersionKind(gv.WithKind("ClusterTrustBundle"))
	ga.SetName("servicedns")
	ga.SetLabels(map[string]string{podcertCanaryingLabel: "live"})
	g.Expect(unstructured.SetNestedField(ga.Object, servicednsSigner, "spec", "signerName")).To(Succeed())
	g.Expect(unstructured.SetNestedField(ga.Object, ca, "spec", "trustBundle")).To(Succeed())

	c := fake.NewClientBuilder().WithRESTMapper(servingClusterTrustBundles("v1")).WithObjects(ga).Build()
	clients := &ClusterSubstrateClients{Client: c, Reader: c}
	bundle, err := clients.trustBundle(context.Background(), servicednsSigner)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(bundle).To(Equal(ca))

	none := fake.NewClientBuilder().WithRESTMapper(servingClusterTrustBundles()).Build()
	clients = &ClusterSubstrateClients{Client: none, Reader: none}
	_, err = clients.trustBundle(context.Background(), servicednsSigner)
	g.Expect(err).To(MatchError(ContainSubstring("doesn't serve ClusterTrustBundles")))
}

func TestClusterSubstrateClientsFor(t *testing.T) {
	g := NewWithT(t)
	ns := "plrl-deploy-operator"
	c := fake.NewClientBuilder().WithScheme(clientgoscheme.Scheme).WithRESTMapper(servingClusterTrustBundles("v1beta1")).WithObjects(
		testTrustBundle("servicedns", servicednsSigner, testCAPEM(t, "servicedns"), true),
		&corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: "deployment-operator", Namespace: ns}},
	).Build()
	clients := &ClusterSubstrateClients{Client: c, Reader: c, Namespace: ns, DefaultAddress: "api.ate-system.svc:443", DefaultServiceAccount: "deployment-operator"}

	runner := &v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: "r"}}
	first, err := clients.For(context.Background(), runner)
	g.Expect(err).NotTo(HaveOccurred())
	again, err := clients.For(context.Background(), runner)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(again).To(BeIdenticalTo(first))

	overridden := runner.DeepCopy()
	overridden.Spec.Substrate = &v1alpha1.DevboxSubstrate{Address: lo.ToPtr("ate.example.svc:443"), ServiceAccountName: lo.ToPtr("substrate-owner")}
	g.Expect(clients.source(overridden)).To(Equal(substrateSource{address: "ate.example.svc:443", serviceAccount: "substrate-owner", signer: servicednsSigner}))
	other, err := clients.For(context.Background(), overridden)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(other).NotTo(BeIdenticalTo(first))

	missingCA := runner.DeepCopy()
	missingCA.Spec.Substrate = &v1alpha1.DevboxSubstrate{CASignerName: lo.ToPtr("missing.example.com/signer")}
	_, err = clients.For(context.Background(), missingCA)
	g.Expect(err).To(MatchError(ContainSubstring("is Substrate installed?")))
}

func TestServiceAccountTokenMintsAndCaches(t *testing.T) {
	g := NewWithT(t)
	sa := &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: "deployment-operator", Namespace: "plrl-deploy-operator"}}
	c := fake.NewClientBuilder().WithScheme(clientgoscheme.Scheme).WithObjects(sa).Build()
	token := &serviceAccountToken{client: c, key: client.ObjectKeyFromObject(sa)}

	md, err := token.GetRequestMetadata(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(md).To(Equal(map[string]string{"authorization": "Bearer fake-token"}))
	g.Expect(token.expires.After(time.Now().Add(substrateTokenRefresh))).To(BeTrue())

	token.token = "cached"
	md, err = token.GetRequestMetadata(context.Background())
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(md["authorization"]).To(Equal("Bearer cached"))

	missing := &serviceAccountToken{client: c, key: client.ObjectKey{Namespace: "plrl-deploy-operator", Name: "missing"}}
	_, err = missing.GetRequestMetadata(context.Background())
	g.Expect(err).To(MatchError(ContainSubstring("minting a Substrate token for ServiceAccount plrl-deploy-operator/missing")))
}
