package console_test

import (
	"fmt"
	"strings"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/pluralsh/console/go/helm-test/internal/common"
	"github.com/pluralsh/console/go/helm-test/test/console"
)

func getContainerTransformer(container corev1.Container) func(containers []corev1.Container) (corev1.Container, error) {
	return func(containers []corev1.Container) (corev1.Container, error) {
		for _, c := range containers {
			if c.Name == container.Name && strings.Contains(c.Image, container.Image) {
				return container, nil
			}
		}

		return corev1.Container{}, fmt.Errorf("could not find matching container with name %s", container.Name)
	}
}

var _ = Describe("Console Chart", func() {
	Context("with default values", Ordered, func() {
		var (
			containers = []corev1.Container{
				{
					Name:  "console",
					Image: "ghcr.io/pluralsh/console",
				},
				{
					Name:  "auth",
					Image: "ghcr.io/pluralsh/oci-auth",
				},
			}
			deployment appsv1.Deployment
			err        error
			manifests  common.ManifestMap
		)

		BeforeAll(func() {
			manifests, err = console.LoadConsoleChart(nil)
			Expect(err).NotTo(HaveOccurred())

			rawDeployment, exists := manifests[console.DefaultResources().Console.Deployment.String()]
			Expect(exists).To(BeTrue())

			err = runtime.DefaultUnstructuredConverter.FromUnstructured(rawDeployment.UnstructuredContent(), &deployment)
			Expect(err).NotTo(HaveOccurred())
		})

		for _, container := range containers {
			It(fmt.Sprintf("should have %s container with official image", container.Name), func() {
				Expect(deployment.Spec.Template.Spec.Containers).To(WithTransform(getContainerTransformer(container), Equal(container)))
			})
		}
	})
})
