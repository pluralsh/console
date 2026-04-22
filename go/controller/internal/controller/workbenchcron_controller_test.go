package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
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

var _ = Describe("Workbench Cron Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			workbenchCronName = "test-cron"
			workbenchName     = "test-workbench-for-cron"
			namespace         = "default"
			id                = "123"
			workbenchID       = "workbench-456"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: workbenchCronName, Namespace: namespace}
		workbenchNamespacedName := types.NamespacedName{Name: workbenchName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the parent Workbench resource")
			workbench := &v1alpha1.Workbench{}
			err := k8sClient.Get(ctx, workbenchNamespacedName, workbench)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.Workbench{
					ObjectMeta: metav1.ObjectMeta{
						Name:      workbenchName,
						Namespace: namespace,
					},
					Spec: v1alpha1.WorkbenchSpec{
						Name:         lo.ToPtr(workbenchName),
						AgentRuntime: lo.ToPtr("test-cluster/test-agent"),
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Workbench{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchName, Namespace: namespace},
			}, func(p *v1alpha1.Workbench) {
				p.Status.ID = lo.ToPtr(workbenchID)
			})).To(Succeed())

			By("creating the custom resource for the Kind WorkbenchCron")
			workbenchCron := &v1alpha1.WorkbenchCron{}
			err = k8sClient.Get(ctx, typeNamespacedName, workbenchCron)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.WorkbenchCron{
					ObjectMeta: metav1.ObjectMeta{
						Name:      workbenchCronName,
						Namespace: namespace,
					},
					Spec: v1alpha1.WorkbenchCronSpec{
						WorkbenchRef: corev1.ObjectReference{
							Name:      workbenchName,
							Namespace: namespace,
						},
						Crontab: "0 * * * *",
						Prompt:  lo.ToPtr("Check the health of all monitored endpoints."),
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			workbenchCron := &v1alpha1.WorkbenchCron{}
			if err := k8sClient.Get(ctx, typeNamespacedName, workbenchCron); err == nil {
				By("Cleanup the specific resource instance WorkbenchCron")
				Expect(k8sClient.Delete(ctx, workbenchCron)).To(Succeed())
			}
			workbench := &v1alpha1.Workbench{}
			if err := k8sClient.Get(ctx, workbenchNamespacedName, workbench); err == nil {
				By("Cleanup the parent Workbench resource")
				Expect(k8sClient.Delete(ctx, workbench)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				workbenchCronFragment *gqlclient.WorkbenchCronFragment
				expectedStatus        v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID: lo.ToPtr(id),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.ReadonlyConditionReason.String(),
							Message: "",
						},
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
				workbenchCronFragment: &gqlclient.WorkbenchCronFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("CreateWorkbenchCron", mock.Anything, workbenchID, mock.Anything).Return(test.workbenchCronFragment, nil)

			reconciler := &controller.WorkbenchCronReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			wc := &v1alpha1.WorkbenchCron{}
			err = k8sClient.Get(ctx, typeNamespacedName, wc)

			Expect(err).NotTo(HaveOccurred())
			Expect(wc.Status.ID).To(Equal(test.expectedStatus.ID))
			Expect(wc.Status.SHA).NotTo(BeNil())
			test.expectedStatus.SHA = wc.Status.SHA
			Expect(common.SanitizeStatusConditions(wc.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully delete the resource", func() {
			By("Delete resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.WorkbenchCron{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchCronName, Namespace: namespace},
			}, func(p *v1alpha1.WorkbenchCron) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.WorkbenchCron{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsWorkbenchCronExists", mock.Anything, id).Return(true, nil)
			fakeConsoleClient.On("DeleteWorkbenchCron", mock.Anything, id).Return(nil)

			reconciler := &controller.WorkbenchCronReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err = reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			workbenchCron := &v1alpha1.WorkbenchCron{}
			err = k8sClient.Get(ctx, typeNamespacedName, workbenchCron)

			Expect(err.Error()).To(Equal("workbenchcrons.deployments.plural.sh \"test-cron\" not found"))
		})
	})
})
