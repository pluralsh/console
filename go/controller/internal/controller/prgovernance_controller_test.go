package controller_test

import (
	"context"

	v1 "k8s.io/api/core/v1"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("PrGovernanceReconciler Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			name      = "test-pr-governance"
			namespace = "default"
			id        = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      name,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind PrGovernance")
			prg := &v1alpha1.PrGovernance{}
			err := k8sClient.Get(ctx, typeNamespacedName, prg)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.PrGovernance{
					ObjectMeta: metav1.ObjectMeta{
						Name:      name,
						Namespace: namespace,
					},
					Spec: v1alpha1.PrGovernanceSpec{
						Name: lo.ToPtr(name),
						ConnectionRef: v1.ObjectReference{
							Name:      name,
							Namespace: namespace,
						},
						Configuration: &v1alpha1.PrGovernanceConfiguration{
							Webhooks: v1alpha1.PrGovernanceWebhook{
								Url: "test",
							},
						},
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
			scm := &v1alpha1.ScmConnection{}
			err = k8sClient.Get(ctx, typeNamespacedName, scm)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.ScmConnection{
					ObjectMeta: metav1.ObjectMeta{
						Name:      name,
						Namespace: namespace,
					},
					Spec: v1alpha1.ScmConnectionSpec{
						Name: name,
						Type: "GITHUB",
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, func(p *v1alpha1.ScmConnection) {
					p.Status.ID = lo.ToPtr(id)
				})).To(Succeed())
			}
		})

		AfterAll(func() {
			scm := &v1alpha1.ScmConnection{}
			if err := k8sClient.Get(ctx, typeNamespacedName, scm); err == nil {
				By("Cleanup the specific resource instance ScmConnection")
				Expect(k8sClient.Delete(ctx, scm)).To(Succeed())
			}
			prg := &v1alpha1.PrGovernance{}
			if err := k8sClient.Get(ctx, typeNamespacedName, prg); err == nil {
				By("Cleanup the specific resource instance PrGovernance")
				Expect(k8sClient.Delete(ctx, prg)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				fragment       *gqlclient.PrGovernanceFragment
				expectedStatus v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("WDUVGRJ367GZ26DHXADTE3AYVXFWIQZWQRL7H2RESA6AZOD2XARA===="),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.ReadyConditionType.String(),
							Status:  metav1.ConditionTrue,
							Reason:  v1alpha1.ReadyConditionReason.String(),
							Message: "",
						},
						{
							Type:   v1alpha1.SynchronizedConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.SynchronizedConditionReason.String(),
						},
					},
				},
				fragment: &gqlclient.PrGovernanceFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UpsertPrGovernance", mock.Anything, mock.Anything).Return(test.fragment, nil)

			nr := &controller.PrGovernanceReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := nr.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			f := &v1alpha1.PrGovernance{}
			err = k8sClient.Get(ctx, typeNamespacedName, f)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(f.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile the resource", func() {
			By("Delete resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.PrGovernance{
				ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
			}, func(p *v1alpha1.PrGovernance) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.PrGovernance{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetPrGovernance", mock.Anything, mock.Anything, mock.Anything).Return(nil, nil)
			fakeConsoleClient.On("DeletePrGovernance", mock.Anything, mock.Anything).Return(nil)

			reconciler := &controller.PrGovernanceReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			err = k8sClient.Get(ctx, typeNamespacedName, resource)

			Expect(err.Error()).To(Equal("prgovernances.deployments.plural.sh \"test-pr-governance\" not found"))
		})

	})

})
