package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

var _ = Describe("GeneratedSecret Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			generatedSecretName = "test"
			namespace           = "default"
		)

		ctx := context.Background()

		namespacedName := types.NamespacedName{Name: generatedSecretName, Namespace: namespace}

		gs := &v1alpha1.GeneratedSecret{}

		BeforeAll(func() {
			By("Creating GeneratedSecret")
			err := k8sClient.Get(ctx, namespacedName, gs)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.GeneratedSecret{
					ObjectMeta: metav1.ObjectMeta{
						Name:      generatedSecretName,
						Namespace: namespace,
					},
					Spec: v1alpha1.GeneratedSecretSpec{
						Template: map[string]string{
							"b64":      "{{ 'one two three' | b64enc }}",
							"name":     "John Doe",
							"password": "{{ 10 | randAlphaNum }}",
						},
						Destinations: []v1alpha1.GeneratedSecretDestination{
							{
								Name:      "secret1",
								Namespace: namespace,
							},
						},
					},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterAll(func() {
			By("Cleanup resources")
			gs := &v1alpha1.GeneratedSecret{}
			Expect(k8sClient.Get(ctx, namespacedName, gs)).NotTo(HaveOccurred())
			Expect(k8sClient.Delete(ctx, gs)).To(Succeed())
		})

		It("Reconcile test", func() {
			reconciler := &controller.GeneratedSecretReconciler{
				Client: k8sClient,
				Scheme: k8sClient.Scheme(),
			}

			// create new persisted secret
			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())
			s1 := &corev1.Secret{}
			Expect(k8sClient.Get(ctx, client.ObjectKey{Name: "secret1", Namespace: namespace}, s1)).To(Succeed())
			Expect(s1.Data["b64"]).To(Equal([]byte("b25lIHR3byB0aHJlZQ==")))
			Expect(s1.Data["name"]).To(Equal([]byte("John Doe")))
			password := s1.Data["password"]
			Expect(len(password)).To(Equal(10))

			// read from persisted secret
			_, err = reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())
			// should have exactly the same data
			Expect(k8sClient.Get(ctx, client.ObjectKey{Name: "secret1", Namespace: namespace}, s1)).To(Succeed())
			Expect(s1.Data["password"]).To(Equal(password))
		})

	})
})
