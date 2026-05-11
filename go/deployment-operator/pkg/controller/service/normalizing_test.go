package service_test

import (
	"context"

	"github.com/pluralsh/deployment-operator/pkg/controller/service"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/yaml"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

var _ = Describe("DiffNormalizers", Ordered, func() {
	Context("BackFillJSONPaths", func() {
		const (
			resourceName = "default-ignore-json-paths"
			namespace    = "default"
		)
		desiredPodYAML := `
apiVersion: v1
kind: Pod
metadata:
  name: default-ignore-json-paths
  namespace: default
spec:
  containers:
    - name: app
      image: nginx:latest
`
		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: "default",
		}

		var desiredPod corev1.Pod
		Expect(yaml.Unmarshal([]byte(desiredPodYAML), &desiredPod)).To(Succeed())
		desiredObj, err := runtime.DefaultUnstructuredConverter.ToUnstructured(&desiredPod)
		Expect(err).ToNot(HaveOccurred())
		desired := unstructured.Unstructured{Object: desiredObj}

		livePod := &corev1.Pod{}

		BeforeAll(func() {
			By("creating the custom resource for the Kind Pod")
			err := kClient.Get(ctx, typeNamespacedName, livePod)
			if err != nil {
				Expect(errors.IsNotFound(err)).To(BeTrue(), "Unexpected error getting Pod: %v", err)
				resource := &corev1.Pod{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
					},
					Spec: corev1.PodSpec{
						Containers: []corev1.Container{
							{
								Name:  "app",
								Image: "nginx:1.25",
							},
						},
					},
				}
				Expect(kClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterAll(func() {
			resource := &corev1.Pod{}
			err := kClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance Pod")
			Expect(kClient.Delete(ctx, resource)).To(Succeed())
		})

		It("should back fill image", func() {
			ignorePaths := []string{"/spec/containers/0/image"}
			desired, err := service.BackFillJSONPaths(context.Background(), kClient, desired, ignorePaths)
			Expect(err).ToNot(HaveOccurred())

			expectedPod := &corev1.Pod{}
			err = runtime.DefaultUnstructuredConverter.FromUnstructuredWithValidation(desired.Object, expectedPod, false)
			Expect(err).ToNot(HaveOccurred())
			Expect(expectedPod.Spec.Containers[0].Image).To(Equal("nginx:1.25"))

		})
	})
})
