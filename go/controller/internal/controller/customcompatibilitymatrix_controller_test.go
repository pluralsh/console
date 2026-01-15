package controller_test

import (
	"context"

	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

var _ = Describe("CustomCompatibilityMatrix Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			customCompatibilityMatrix = "global"
			namespace                 = "default"
			id                        = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      customCompatibilityMatrix,
			Namespace: namespace,
		}

		ccm := &v1alpha1.CustomCompatibilityMatrix{}
		BeforeAll(func() {
			By("creating the custom resource for the Kind CustomCompatibilityMatrix")
			err := k8sClient.Get(ctx, typeNamespacedName, ccm)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.CustomCompatibilityMatrix{
					ObjectMeta: metav1.ObjectMeta{
						Name:      customCompatibilityMatrix,
						Namespace: namespace,
					},
					Spec: v1alpha1.CustomCompatibilityMatrixSpec{
						Name: lo.ToPtr(customCompatibilityMatrix),
						Versions: []*v1alpha1.CompatibilityMatrixVersion{
							{
								Version: "1",
							},
							{
								Version:      "2",
								ChartVersion: lo.ToPtr("1.2.3"),
								Kube:         []string{"1.21"},
								Summary: &v1alpha1.CompatibilityMatrixSummary{
									HelmChanges:     []string{"Added support for X"},
									BreakingChanges: []string{"Removed support for Y"},
								},
							},
						},
					}}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterAll(func() {
			resource := &v1alpha1.CustomCompatibilityMatrix{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance CustomCompatibilityMatrix")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())
		})

		It("should successfully reconcile the update resource", func() {
			By("Reconciling the update resource")
			test := struct {
				returnResource *gqlclient.CustomCompatibilityMatrixFragment
				expectedStatus v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
					SHA: lo.ToPtr("CW7M7QKANSD7BPP5T6ZO3Z6R4SEUHZ5VD2LFABCWQHZPZTGLOUCA===="),
					Conditions: []metav1.Condition{
						{
							Type:   v1alpha1.ReadyConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.ReadyConditionReason.String(),
						},
						{
							Type:   v1alpha1.SynchronizedConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.SynchronizedConditionReason.String(),
						},
					},
				},
				returnResource: &gqlclient.CustomCompatibilityMatrixFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UpsertCustomCompatibilityMatrix", mock.Anything, mock.Anything).Return(test.returnResource, nil)

			controllerReconciler := &controller.CustomCompatibilityMatrixReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			resource := &v1alpha1.CustomCompatibilityMatrix{}
			err = k8sClient.Get(ctx, typeNamespacedName, resource)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(resource.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})
	})
})
