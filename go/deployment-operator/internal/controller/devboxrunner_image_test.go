package controller

import (
	"testing"

	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

func devboxImage() *ResolvedDevboxImage {
	return &ResolvedDevboxImage{
		Labels: map[string]string{
			v1alpha1.DevboxImageContractLabel:      "v1",
			v1alpha1.DevboxImageDaemonVersionLabel: "0.12.0",
		},
		Entrypoint: []string{devboxDaemonEntrypoint},
		User:       "1000:1000",
		Env:        map[string]string{"DEVBOX_TRUST_DIR": "/var/lib/devbox/trust"},
	}
}

func TestDevboxImageContract(t *testing.T) {
	g := NewWithT(t)

	g.Expect(CheckDevboxImageContract(devboxImage(), "0.12.0").OK()).To(BeTrue())
	g.Expect(CheckDevboxImageContract(devboxImage(), "dev").OK()).To(BeTrue(), "dev builds skip the version check")

	cases := map[string]struct {
		mutate    func(*ResolvedDevboxImage)
		operator  string
		violation string
	}{
		"missing label":       {mutate: func(i *ResolvedDevboxImage) { delete(i.Labels, v1alpha1.DevboxImageContractLabel) }, violation: "sh.plural.devbox/contract"},
		"entrypoint override": {mutate: func(i *ResolvedDevboxImage) { i.Entrypoint = []string{"/bin/sh", "-c"} }, violation: "must not override ENTRYPOINT"},
		"root user":           {mutate: func(i *ResolvedDevboxImage) { i.User = "" }, violation: "want UID 1000"},
		"named user":          {mutate: func(i *ResolvedDevboxImage) { i.User = "dev" }, violation: "want UID 1000"},
		"no trust dir":        {mutate: func(i *ResolvedDevboxImage) { delete(i.Env, "DEVBOX_TRUST_DIR") }, violation: "DEVBOX_TRUST_DIR"},
		"no daemon version":   {mutate: func(i *ResolvedDevboxImage) { delete(i.Labels, v1alpha1.DevboxImageDaemonVersionLabel) }, violation: "daemon-version is missing"},
		"other major":         {mutate: func(i *ResolvedDevboxImage) { i.Labels[v1alpha1.DevboxImageDaemonVersionLabel] = "1.0.0" }, violation: "different release line"},
		"newer minor":         {mutate: func(i *ResolvedDevboxImage) { i.Labels[v1alpha1.DevboxImageDaemonVersionLabel] = "0.13.1" }, violation: "newer than the operator"},
	}
	for desc, tc := range cases {
		img := devboxImage()
		tc.mutate(img)
		res := CheckDevboxImageContract(img, "0.12.0")
		g.Expect(res.OK()).To(BeFalse(), desc)
		g.Expect(res.Violations).To(ContainElement(ContainSubstring(tc.violation)), desc)
	}

	img := devboxImage()
	img.Labels[v1alpha1.DevboxImageDaemonVersionLabel] = "0.11.4"
	res := CheckDevboxImageContract(img, "0.12.0")
	g.Expect(res.OK()).To(BeTrue())
	g.Expect(res.Outdated).To(BeEmpty(), "one minor behind is fine")

	img.Labels[v1alpha1.DevboxImageDaemonVersionLabel] = "0.10.0"
	res = CheckDevboxImageContract(img, "0.12.0")
	g.Expect(res.OK()).To(BeTrue())
	g.Expect(res.Outdated).To(ContainSubstring("more than one minor release behind"))
}

func TestDevboxDockerConfigKeychain(t *testing.T) {
	g := NewWithT(t)
	kc := dockerConfigKeychain{}
	g.Expect(kc.add(&corev1.Secret{Data: map[string][]byte{
		corev1.DockerConfigJsonKey: []byte(`{"auths":{"https://index.docker.io/v1/":{"auth":"dXNlcjpwYXNz"},"ghcr.io":{"username":"u","password":"p"}}}`),
	}})).To(Succeed())
	g.Expect(kc).To(HaveKey("index.docker.io"))
	g.Expect(kc["index.docker.io"].Username).To(Equal("user"))
	g.Expect(kc["index.docker.io"].Password).To(Equal("pass"))
	g.Expect(kc["ghcr.io"].Password).To(Equal("p"))
	g.Expect(kc.add(&corev1.Secret{})).NotTo(Succeed())
}

func TestDevboxConfigDefaults(t *testing.T) {
	g := NewWithT(t)
	t.Setenv("IMAGE_TAG", "0.12.0")
	t.Setenv("DEVBOXES_ENABLED", "true")
	t.Setenv("DEVBOX_GATEWAY_SA_ANNOTATIONS", "eks.amazonaws.com/role-arn=arn:aws:iam::1:role/gw, iam.gke.io/gcp-service-account=gw@p.iam.gserviceaccount.com")
	cfg := LoadDevboxConfig("plrl-deploy-operator", "https://console.example.com/ext/gql", "token", "cid")

	g.Expect(cfg.Enabled).To(BeTrue())
	g.Expect(cfg.DevboxImage()).To(Equal("ghcr.io/pluralsh/devbox-fat:0.12.0"))
	g.Expect(cfg.GatewayImageRef()).To(Equal("ghcr.io/pluralsh/devbox-gateway:0.12.0"))
	g.Expect(cfg.KasURL).To(Equal("wss://console.example.com/ext/devbox"))
	g.Expect(cfg.GatewayServiceAccountAnnotations).To(HaveKeyWithValue("eks.amazonaws.com/role-arn", "arn:aws:iam::1:role/gw"))
	g.Expect(cfg.GatewayServiceAccountAnnotations).To(HaveKeyWithValue("iam.gke.io/gcp-service-account", "gw@p.iam.gserviceaccount.com"))
	g.Expect(cfg.GatewaySpiffeID()).To(Equal("spiffe://cluster.local/ns/plrl-deploy-operator/sa/devbox-gateway"))
	g.Expect(cfg.WorkerPoolNamespace).To(Equal("plrl-deploy-operator"))
}

func TestDevboxConfigBaseRegistry(t *testing.T) {
	g := NewWithT(t)
	g.Expect(common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{BaseRegistryURL: lo.ToPtr("mirror.example.com/plural")})).To(Succeed())
	t.Cleanup(func() { _ = common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{}) })

	cfg := DevboxConfig{OperatorVersion: "0.12.0"}
	g.Expect(cfg.DevboxImage()).To(Equal("mirror.example.com/plural/pluralsh/devbox-fat:0.12.0"))
	g.Expect(cfg.GatewayImageRef()).To(Equal("mirror.example.com/plural/pluralsh/devbox-gateway:0.12.0"))

	cfg.DefaultImage, cfg.GatewayImage = "registry.internal/devbox:1", "registry.internal/gateway:1"
	g.Expect(cfg.DevboxImage()).To(Equal("registry.internal/devbox:1"))
	g.Expect(cfg.GatewayImageRef()).To(Equal("registry.internal/gateway:1"))
}
