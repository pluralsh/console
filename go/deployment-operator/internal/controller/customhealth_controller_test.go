package controller

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/pkg/common"
)

var _ = Describe("Customhealt Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			resourceName = "default"
			namespace    = "default"
			script       = "test script"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: "default",
		}

		customHealth := &v1alpha1.CustomHealth{}

		BeforeAll(func() {
			By("creating the custom resource for the Kind CustomHealth")
			err := kClient.Get(ctx, typeNamespacedName, customHealth)
			if err != nil {
				Expect(errors.IsNotFound(err)).To(BeTrue(), "Unexpected error getting CustomHealth: %v", err)
				resource := &v1alpha1.CustomHealth{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
					},
					Spec: v1alpha1.CustomHealthSpec{
						Script: script,
					},
				}
				Expect(kClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterAll(func() {
			resource := &v1alpha1.CustomHealth{}
			err := kClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance CustomHealth")
			Expect(kClient.Delete(ctx, resource)).To(Succeed())
		})

		It("should successfully reconcile resource", func() {
			By("Reconciling the import resource")
			reconciler := &CustomHealthReconciler{
				Client: kClient,
				Scheme: kClient.Scheme(),
			}
			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			Expect(common.GetLuaScript().GetValue()).Should(Equal(script))

		})
	})

})
