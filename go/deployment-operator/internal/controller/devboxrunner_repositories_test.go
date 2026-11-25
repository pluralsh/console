package controller

import (
	"testing"
	"time"

	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

func TestValidateDevboxRepositories(t *testing.T) {
	g := NewWithT(t)
	runner := &v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{
		Repositories: []v1alpha1.DevboxRepository{{URL: "https://github.com/pluralsh/console"}},
	}}
	g.Expect(validateDevboxRepositories(runner)).To(Succeed(), "an empty allowlist allows every repository")

	runner.Spec.AllowedRepositories = []string{"github.com/pluralsh/console.git"}
	g.Expect(validateDevboxRepositories(runner)).To(Succeed())

	runner.Spec.AllowedRepositories = []string{"github.com/pluralsh/plural"}
	g.Expect(validateDevboxRepositories(runner)).To(MatchError(ContainSubstring("isn't on allowedRepositories")))

	runner.Spec.AllowedRepositories = nil
	runner.Spec.Repositories = append(runner.Spec.Repositories, v1alpha1.DevboxRepository{URL: "https://GitHub.com/pluralsh/console.git"})
	g.Expect(validateDevboxRepositories(runner)).To(MatchError(ContainSubstring("listed twice")))
}

func TestDevboxGoldenEgressPolicy(t *testing.T) {
	g := NewWithT(t)
	runner := &v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: "platform"}}
	g.Expect(devboxGoldenEgressPolicy(runner)).To(BeNil(), "nothing to do at golden boot needs no egress")

	runner.Spec.Repositories = []v1alpha1.DevboxRepository{{URL: "https://github.com/pluralsh/console"}}
	runner.Spec.HTTPAllowlist = []v1alpha1.DevboxHTTPAllowlistEntry{{Host: "GitHub.com"}, {Host: "example.com"}}
	policy := devboxGoldenEgressPolicy(runner)
	g.Expect(policy).NotTo(BeNil())

	hosts := map[string]int{}
	for _, r := range policy.Rules {
		for _, h := range r.GetHttps().GetHostnames() {
			hosts[h]++
		}
	}
	g.Expect(hosts["github.com"]).To(Equal(1), "the SCM rule wins over the allowlist entry")
	g.Expect(hosts).To(HaveKey("api.github.com"))
	g.Expect(hosts).To(HaveKey("example.com"))

	scm, ok := lo.Find(policy.Rules, func(r *ateapi.EgressRule) bool {
		return lo.Contains(r.GetHttps().GetHostnames(), "github.com")
	})
	g.Expect(ok).To(BeTrue())
	g.Expect(scm.Https.Effects.ReplaceHeaders).To(HaveLen(2))
	g.Expect(scm.Https.Effects.ReplaceHeaders[0].CredentialUri).To(Equal("ate-secret://plural.sh/instances/golden.platform/scm/github.com"))
	g.Expect(scm.Https.Effects.ReplaceHeaders[1].CredentialUri).To(Equal("ate-secret://plural.sh/instances/golden.platform/scm-token/github.com"))
}

func TestDevboxGoldenBootTimeout(t *testing.T) {
	g := NewWithT(t)
	spec := v1alpha1.DevboxRunnerSpec{}
	g.Expect(spec.HasGoldenBootWork()).To(BeFalse())
	g.Expect(spec.GoldenBootTimeout()).To(Equal(v1alpha1.DevboxDefaultBootstrapTimeout))

	spec.BootstrapScript = lo.ToPtr("make deps")
	spec.BootstrapTimeout = &metav1.Duration{Duration: 3 * time.Hour}
	g.Expect(spec.HasGoldenBootWork()).To(BeTrue())
	g.Expect(spec.GoldenBootTimeout()).To(Equal(v1alpha1.DevboxMaxBootstrapTimeout), "Substrate caps the wakeup probe at an hour")
}
