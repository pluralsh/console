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

var _ = Describe("Workbench Prompt Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			workbenchPromptName = "test-prompt"
			workbenchName       = "test-workbench-for-prompt"
			namespace           = "default"
			id                  = "prompt-123"
			workbenchID         = "workbench-456"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: workbenchPromptName, Namespace: namespace}
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

			By("creating the custom resource for the Kind WorkbenchPrompt")
			workbenchPrompt := &v1alpha1.WorkbenchPrompt{}
			err = k8sClient.Get(ctx, typeNamespacedName, workbenchPrompt)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.WorkbenchPrompt{
					ObjectMeta: metav1.ObjectMeta{
						Name:      workbenchPromptName,
						Namespace: namespace,
					},
					Spec: v1alpha1.WorkbenchPromptSpec{
						WorkbenchRef: corev1.ObjectReference{
							Name:      workbenchName,
							Namespace: namespace,
						},
						Title:    lo.ToPtr("Investigate"),
						Category: lo.ToPtr("Operations"),
						Prompt:   "Investigate the current incident.",
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			workbenchPrompt := &v1alpha1.WorkbenchPrompt{}
			if err := k8sClient.Get(ctx, typeNamespacedName, workbenchPrompt); err == nil {
				By("Cleanup the specific resource instance WorkbenchPrompt")
				Expect(k8sClient.Delete(ctx, workbenchPrompt)).To(Succeed())
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
				workbenchPromptFragment *gqlclient.WorkbenchPromptFragment
				expectedStatus          v1alpha1.Status
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
				workbenchPromptFragment: &gqlclient.WorkbenchPromptFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("CreateWorkbenchPrompt", mock.Anything, workbenchID, mock.Anything).Return(test.workbenchPromptFragment, nil)

			reconciler := &controller.WorkbenchPromptReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			wp := &v1alpha1.WorkbenchPrompt{}
			err = k8sClient.Get(ctx, typeNamespacedName, wp)

			Expect(err).NotTo(HaveOccurred())
			Expect(wp.Status.ID).To(Equal(test.expectedStatus.ID))
			Expect(wp.Status.SHA).NotTo(BeNil())
			test.expectedStatus.SHA = wp.Status.SHA
			Expect(common.SanitizeStatusConditions(wp.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should update the resource when the spec changes", func() {
			By("Patch resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.WorkbenchPrompt{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchPromptName, Namespace: namespace},
			}, func(p *v1alpha1.WorkbenchPrompt) {
				p.Spec.Prompt = "Investigate the updated incident."
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchPrompt", mock.Anything, id).Return(&gqlclient.WorkbenchPromptFragment{ID: id}, nil)
			fakeConsoleClient.On("UpdateWorkbenchPrompt", mock.Anything, id, mock.Anything).Return(&gqlclient.WorkbenchPromptFragment{ID: id}, nil)

			reconciler := &controller.WorkbenchPromptReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())
		})

		It("should restore the desired prompt fields when the API resource drifts", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchPrompt", mock.Anything, id).Return(&gqlclient.WorkbenchPromptFragment{
				ID:       id,
				Title:    "Changed externally",
				Category: "Other",
				Prompt:   lo.ToPtr("Changed externally."),
			}, nil)
			fakeConsoleClient.On("UpdateWorkbenchPrompt", mock.Anything, id, mock.Anything).Return(&gqlclient.WorkbenchPromptFragment{ID: id}, nil)

			reconciler := &controller.WorkbenchPromptReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())
			fakeConsoleClient.AssertCalled(mocks.TestingT, "UpdateWorkbenchPrompt", mock.Anything, id, mock.Anything)
		})

		It("should successfully delete the resource", func() {
			By("Delete resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.WorkbenchPrompt{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchPromptName, Namespace: namespace},
			}, func(p *v1alpha1.WorkbenchPrompt) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.WorkbenchPrompt{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsWorkbenchPromptExists", mock.Anything, id).Return(true, nil)
			fakeConsoleClient.On("DeleteWorkbenchPrompt", mock.Anything, id).Return(nil)

			reconciler := &controller.WorkbenchPromptReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err = reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())
		})
	})

	Context("When the referenced workbench is missing", func() {
		const (
			workbenchPromptName = "test-prompt-missing-workbench"
			namespace           = "default"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: workbenchPromptName, Namespace: namespace}

		BeforeEach(func() {
			resource := &v1alpha1.WorkbenchPrompt{
				ObjectMeta: metav1.ObjectMeta{
					Name:      workbenchPromptName,
					Namespace: namespace,
				},
				Spec: v1alpha1.WorkbenchPromptSpec{
					WorkbenchRef: corev1.ObjectReference{
						Name:      "missing-workbench",
						Namespace: namespace,
					},
					Prompt: "Investigate the current incident.",
				},
			}
			Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
		})

		AfterEach(func() {
			workbenchPrompt := &v1alpha1.WorkbenchPrompt{}
			if err := k8sClient.Get(ctx, typeNamespacedName, workbenchPrompt); err == nil {
				Expect(k8sClient.Delete(ctx, workbenchPrompt)).To(Succeed())
			}
		})

		It("should wait for the workbench", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)

			reconciler := &controller.WorkbenchPromptReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			result, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).NotTo(BeZero())
		})
	})
})
