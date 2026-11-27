package controller

import (
	"testing"

	. "github.com/onsi/gomega"
	"github.com/samber/lo"

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
