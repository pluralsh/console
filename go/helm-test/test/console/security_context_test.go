package console_test

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/pluralsh/console/go/helm-test/internal/common"
	"github.com/pluralsh/console/go/helm-test/test/console"
)

var _ = Describe("Console Chart", func() {
	Context("with custom console security context values", Ordered, func() {
		var (
			deployment      appsv1.Deployment
			err             error
			manifests       common.ManifestMap
			securityContext = corev1.PodSecurityContext{
				RunAsUser:  lo.ToPtr(int64(1000)),
				RunAsGroup: lo.ToPtr(int64(1000)),
			}
			values = map[string]interface{}{
				"console": map[string]interface{}{
					"securityContext": securityContext,
				},
			}
		)

		BeforeAll(func() {
			manifests, err = console.LoadConsoleChart(values)
			Expect(err).NotTo(HaveOccurred())

			rawDeployment, exists := manifests[console.DefaultResources().Console.Deployment.String()]
			Expect(exists).To(BeTrue())

			err = runtime.DefaultUnstructuredConverter.FromUnstructured(rawDeployment.UnstructuredContent(), &deployment)
			Expect(err).NotTo(HaveOccurred())
		})

		It("should have console pod with custom security context", func() {
			Expect(deployment.Spec.Template.Spec.SecurityContext).To(BeEquivalentTo(&securityContext))
		})
	})

	Context("with custom console pod security context values", Ordered, func() {
		var (
			deployment      appsv1.Deployment
			err             error
			manifests       common.ManifestMap
			securityContext = corev1.SecurityContext{
				RunAsUser:    lo.ToPtr(int64(1000)),
				RunAsGroup:   lo.ToPtr(int64(1000)),
				RunAsNonRoot: lo.ToPtr(true),
			}
			values = map[string]interface{}{
				"console": map[string]interface{}{
					"containerSecurityContext": securityContext,
				},
			}
		)

		BeforeAll(func() {
			manifests, err = console.LoadConsoleChart(values)
			Expect(err).NotTo(HaveOccurred())

			rawDeployment, exists := manifests[console.DefaultResources().Console.Deployment.String()]
			Expect(exists).To(BeTrue())

			err = runtime.DefaultUnstructuredConverter.FromUnstructured(rawDeployment.UnstructuredContent(), &deployment)
			Expect(err).NotTo(HaveOccurred())
		})

		It("should have console containers with custom security context", func() {
			for _, container := range deployment.Spec.Template.Spec.Containers {
				Expect(container.SecurityContext).To(BeEquivalentTo(&securityContext))
			}
		})
	})
})
