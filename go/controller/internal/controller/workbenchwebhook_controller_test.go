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

var _ = Describe("Workbench Webhook Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			workbenchWebhookName = "test-webhook"
			workbenchName        = "test-workbench-for-webhook"
			namespace            = "default"
			id                   = "456"
			workbenchID          = "workbench-789"
			observabilityWebhook = "my-grafana-webhook"
			observabilityID      = "obs-webhook-123"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: workbenchWebhookName, Namespace: namespace}
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

			By("creating the custom resource for the Kind WorkbenchWebhook")
			workbenchWebhook := &v1alpha1.WorkbenchWebhook{}
			err = k8sClient.Get(ctx, typeNamespacedName, workbenchWebhook)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.WorkbenchWebhook{
					ObjectMeta: metav1.ObjectMeta{
						Name:      workbenchWebhookName,
						Namespace: namespace,
					},
					Spec: v1alpha1.WorkbenchWebhookSpec{
						WorkbenchRef: corev1.ObjectReference{
							Name:      workbenchName,
							Namespace: namespace,
						},
						WebhookName: lo.ToPtr(observabilityWebhook),
						Matches: &v1alpha1.WorkbenchWebhookMatchesSpec{
							Substring:       lo.ToPtr("error"),
							CaseInsensitive: lo.ToPtr(true),
						},
						Prompt: lo.ToPtr("Analyze the incoming alert and suggest remediation steps."),
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			workbenchWebhook := &v1alpha1.WorkbenchWebhook{}
			if err := k8sClient.Get(ctx, typeNamespacedName, workbenchWebhook); err == nil {
				By("Cleanup the specific resource instance WorkbenchWebhook")
				Expect(k8sClient.Delete(ctx, workbenchWebhook)).To(Succeed())
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
				workbenchWebhookFragment *gqlclient.WorkbenchWebhookFragment
				expectedStatus           v1alpha1.Status
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
				workbenchWebhookFragment: &gqlclient.WorkbenchWebhookFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetObservabilityWebhookByName", mock.Anything, observabilityWebhook).
				Return(&gqlclient.ObservabilityWebhookFragment{ID: observabilityID}, nil)
			fakeConsoleClient.On("CreateWorkbenchWebhook", mock.Anything, workbenchID, mock.Anything).
				Return(test.workbenchWebhookFragment, nil)

			reconciler := &controller.WorkbenchWebhookReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			ww := &v1alpha1.WorkbenchWebhook{}
			err = k8sClient.Get(ctx, typeNamespacedName, ww)

			Expect(err).NotTo(HaveOccurred())
			Expect(ww.Status.ID).To(Equal(test.expectedStatus.ID))
			Expect(ww.Status.SHA).NotTo(BeNil())
			test.expectedStatus.SHA = ww.Status.SHA
			Expect(common.SanitizeStatusConditions(ww.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully delete the resource", func() {
			By("Delete resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.WorkbenchWebhook{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchWebhookName, Namespace: namespace},
			}, func(p *v1alpha1.WorkbenchWebhook) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.WorkbenchWebhook{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsWorkbenchWebhookExists", mock.Anything, id).Return(true, nil)
			fakeConsoleClient.On("DeleteWorkbenchWebhook", mock.Anything, id).Return(nil)

			reconciler := &controller.WorkbenchWebhookReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err = reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			workbenchWebhook := &v1alpha1.WorkbenchWebhook{}
			err = k8sClient.Get(ctx, typeNamespacedName, workbenchWebhook)

			Expect(err.Error()).To(Equal("workbenchwebhooks.deployments.plural.sh \"test-webhook\" not found"))
		})
	})
})
