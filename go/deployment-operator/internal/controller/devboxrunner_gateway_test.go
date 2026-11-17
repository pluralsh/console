package controller

import (
	"testing"

	. "github.com/onsi/gomega"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestDevboxGatewayRequiresPodCertificates(t *testing.T) {
	serving := func(kinds map[string]string) *DevboxRunnerReconciler {
		m := meta.NewDefaultRESTMapper(nil)
		for kind, version := range kinds {
			m.Add(schema.GroupVersionKind{Group: "certificates.k8s.io", Version: version, Kind: kind}, meta.RESTScopeRoot)
		}
		return &DevboxRunnerReconciler{Client: fake.NewClientBuilder().WithRESTMapper(m).Build()}
	}

	t.Run("GA", func(t *testing.T) {
		NewWithT(t).Expect(serving(map[string]string{"PodCertificateRequest": "v1", "ClusterTrustBundle": "v1"}).checkPodCertificates()).To(Succeed())
	})
	t.Run("beta", func(t *testing.T) {
		NewWithT(t).Expect(serving(map[string]string{"PodCertificateRequest": "v1beta1", "ClusterTrustBundle": "v1beta1"}).checkPodCertificates()).To(Succeed())
	})
	t.Run("missing", func(t *testing.T) {
		err := serving(map[string]string{"ClusterTrustBundle": "v1beta1"}).checkPodCertificates()
		g := NewWithT(t)
		g.Expect(err).To(MatchError(ContainSubstring("doesn't serve PodCertificateRequest,")))
		g.Expect(err).To(MatchError(ContainSubstring("Kubernetes 1.37")))
	})
	t.Run("none", func(t *testing.T) {
		err := serving(nil).checkPodCertificates()
		NewWithT(t).Expect(err).To(MatchError(ContainSubstring("PodCertificateRequest or ClusterTrustBundle")))
	})
}
