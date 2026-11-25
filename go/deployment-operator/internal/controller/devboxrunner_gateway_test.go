package controller

import (
	"os"
	"path/filepath"
	"testing"

	. "github.com/onsi/gomega"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
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

func TestDevboxGatewayPodTemplateMountsSpawnedCA(t *testing.T) {
	g := NewWithT(t)
	dir := t.TempDir()
	caPath := filepath.Join(dir, "ca-certificates.crt")
	g.Expect(os.WriteFile(caPath, []byte("-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n"), 0o644)).To(Succeed())

	common.SetSpawnedCAConfigForTest(common.SpawnedCAConfig{
		Enabled:    true,
		ConfigMap:  "plural-ca-bundle",
		SourceFile: caPath,
		Key:        "ca-certificates.crt",
	})
	t.Cleanup(func() { common.SetSpawnedCAConfigForTest(common.SpawnedCAConfig{}) })

	r := &DevboxRunnerReconciler{Config: DevboxConfig{GatewayImage: "ghcr.io/pluralsh/devbox-gateway:test"}}
	tpl := r.gatewayPodTemplate("checksum", nil)
	g.Expect(tpl.Spec.Volumes).To(ContainElement(HaveField("Name", common.SpawnedCAVolumeName)))
	g.Expect(tpl.Spec.Containers[0].VolumeMounts).To(ContainElement(HaveField("Name", common.SpawnedCAVolumeName)))
	g.Expect(tpl.Spec.Containers[0].VolumeMounts).To(ContainElement(HaveField("MountPath", "/etc/ssl/certs/ca-certificates.crt")))
}
