package controller

import (
	"context"
	"testing"

	. "github.com/onsi/gomega"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
)

func TestDevboxWorkerImageFor(t *testing.T) {
	g := NewWithT(t)
	g.Expect(workerImageFor("ghcr.io/agent-substrate/substrate/atecontroller:v1.0.0", v1alpha1.DevboxSandboxGVisor)).
		To(Equal("ghcr.io/agent-substrate/substrate/ateworker-gvisor:v1.0.0"))
	g.Expect(workerImageFor("mirror.example.com:5000/substrate/atecontroller:v1.0.0@sha256:abc", v1alpha1.DevboxSandboxMicroVM)).
		To(Equal("mirror.example.com:5000/substrate/ateworker-microvm:v1.0.0"), "the controller's digest doesn't apply to the worker")
	g.Expect(workerImageFor("ghcr.io/agent-substrate/substrate/atecontroller@sha256:abc", v1alpha1.DevboxSandboxGVisor)).To(BeEmpty())
	g.Expect(workerImageFor("mirror.example.com:5000/substrate/atecontroller", v1alpha1.DevboxSandboxGVisor)).To(BeEmpty())
	g.Expect(workerImageFor("example.com/custom-controller:v1", v1alpha1.DevboxSandboxGVisor)).To(BeEmpty())
}

func TestDevboxInstalledWorkerImage(t *testing.T) {
	ctx := context.Background()
	g := NewWithT(t)
	cfg := DevboxConfig{SubstrateNamespace: "ate-system"}

	r := &DevboxRunnerReconciler{Client: fake.NewClientBuilder().Build(), Config: cfg}
	image, err := r.installedWorkerImage(ctx, v1alpha1.DevboxSandboxGVisor)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(image).To(BeEmpty(), "no ate-controller, nothing to derive")

	controller := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: ateControllerName, Namespace: "ate-system"},
		Spec: appsv1.DeploymentSpec{Template: corev1.PodTemplateSpec{Spec: corev1.PodSpec{Containers: []corev1.Container{
			{Name: "controller", Image: "ghcr.io/agent-substrate/substrate/atecontroller:v1.0.0"},
		}}}},
	}
	r = &DevboxRunnerReconciler{Client: fake.NewClientBuilder().WithObjects(controller).Build(), Config: cfg}
	image, err = r.installedWorkerImage(ctx, v1alpha1.DevboxSandboxGVisor)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(image).To(Equal("ghcr.io/agent-substrate/substrate/ateworker-gvisor:v1.0.0"))
}
