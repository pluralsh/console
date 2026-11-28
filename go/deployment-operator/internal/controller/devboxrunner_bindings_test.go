package controller

import (
	"testing"

	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/resource"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
)

func TestDevboxAttributesCreateBindings(t *testing.T) {
	g := NewWithT(t)
	r := &DevboxRunnerReconciler{}
	runner := &v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{
		Agents: []v1alpha1.DevboxAgent{{Type: v1alpha1.DevboxAgentClaude, Default: lo.ToPtr(true)}},
	}}
	runner.Name = "platform"

	attrs, err := r.devboxAttributes(runner, nil)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(attrs.CreateBindings).To(BeEmpty())

	runner.Spec.Bindings = &v1alpha1.DevboxRunnerBindings{Create: []v1alpha1.Binding{
		{UserEmail: lo.ToPtr("dev@example.com")},
		{GroupName: lo.ToPtr("platform")},
	}}
	attrs, err = r.devboxAttributes(runner, nil)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(attrs.CreateBindings).To(Equal([]*console.AgentBindingAttributes{
		{UserEmail: lo.ToPtr("dev@example.com")},
		{GroupName: lo.ToPtr("platform")},
	}))
}

func TestDevboxAttributesReportTheHomeAsDisk(t *testing.T) {
	g := NewWithT(t)
	r := &DevboxRunnerReconciler{}
	runner := &v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{
		Agents:    []v1alpha1.DevboxAgent{{Type: v1alpha1.DevboxAgentClaude, Default: lo.ToPtr(true)}},
		Resources: &v1alpha1.DevboxResources{CPU: lo.ToPtr(resource.MustParse("4")), Disk: lo.ToPtr(resource.MustParse("20Gi"))},
	}}
	runner.Name = "platform"

	attrs, err := r.devboxAttributes(runner, nil)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(*attrs.Resources).To(MatchJSON(`{"cpu": "4", "disk": "20Gi"}`))

	runner.Spec.Home = &v1alpha1.DevboxHome{Storage: lo.ToPtr(v1alpha1.DevboxHomeZeroFS), Size: lo.ToPtr(resource.MustParse("50Gi"))}
	attrs, err = r.devboxAttributes(runner, nil)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(*attrs.Resources).To(MatchJSON(`{"cpu": "4", "disk": "50Gi"}`))
}

func TestDevboxAttributesShowPublicEgress(t *testing.T) {
	g := NewWithT(t)
	r := &DevboxRunnerReconciler{}
	runner := &v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{
		Agents:            []v1alpha1.DevboxAgent{{Type: v1alpha1.DevboxAgentClaude, Default: lo.ToPtr(true)}},
		AllowPublicEgress: lo.ToPtr(true),
	}}
	runner.Name = "platform"

	attrs, err := r.devboxAttributes(runner, nil)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(attrs.HTTPAllowlist).To(ContainElements(
		&console.DevboxHTTPAllowAttributes{Host: "*", Port: lo.ToPtr(int64(443)), Passthrough: lo.ToPtr(true)},
		&console.DevboxHTTPAllowAttributes{Host: "*", Port: lo.ToPtr(int64(80))},
	))
}
