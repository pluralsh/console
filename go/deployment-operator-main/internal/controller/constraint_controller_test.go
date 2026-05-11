package controller

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	templatesv1 "github.com/open-policy-agent/frameworks/constraint/pkg/apis/templates/v1"
	constraintstatusv1beta1 "github.com/open-policy-agent/gatekeeper/v3/apis/status/v1beta1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/pkg/test/mocks"
)

var _ = Describe("ConstraintPodStatus Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			resourceName = "default"
			namespace    = "default"
			kind         = "Test"
			templateName = "test-template"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: "default",
		}

		cps := new(constraintstatusv1beta1.ConstraintPodStatus)

		BeforeAll(func() {
			By("creating the custom resource for the Kind ConstraintPodStatus")
			err := kClient.Get(ctx, typeNamespacedName, cps)
			if err != nil {
				Expect(errors.IsNotFound(err)).To(BeTrue(), "Unexpected error getting ConstraintPodStatus: %v", err)
				resource := &constraintstatusv1beta1.ConstraintPodStatus{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
						Labels:    map[string]string{constraintstatusv1beta1.ConstraintNameLabel: templateName, constraintstatusv1beta1.ConstraintKindLabel: kind, constraintstatusv1beta1.ConstraintTemplateNameLabel: templateName},
					},
					Status: constraintstatusv1beta1.ConstraintPodStatusStatus{},
				}
				Expect(kClient.Create(ctx, resource)).To(Succeed())
			}
			template := &templatesv1.ConstraintTemplate{
				ObjectMeta: metav1.ObjectMeta{
					Name:      templateName,
					Namespace: namespace,
				},
				Spec: templatesv1.ConstraintTemplateSpec{},
			}
			Expect(kClient.Create(ctx, template)).To(Succeed())
		})

		AfterAll(func() {
			resource := &constraintstatusv1beta1.ConstraintPodStatus{}
			err := kClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance ConstraintPodStatus")
			Expect(kClient.Delete(ctx, resource)).To(Succeed())

			template := new(templatesv1.ConstraintTemplate)
			Expect(kClient.Get(ctx, types.NamespacedName{Name: templateName}, template)).To(Succeed())
			Expect(kClient.Delete(ctx, template)).To(Succeed())
		})

		It("should fail reconcile resource", func() {
			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			reconciler := &ConstraintReconciler{
				Client:        kClient,
				Scheme:        kClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
				Reader:        kClient,
			}
			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).To(HaveOccurred())
		})
	})

})
