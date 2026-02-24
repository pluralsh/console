package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("Workbench Tool Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			workbenchToolName = "test"
			namespace         = "default"
			id                = "123"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: workbenchToolName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the custom resource for the Kind WorkbenchTool")
			workbenchTool := &v1alpha1.WorkbenchTool{}
			err := k8sClient.Get(ctx, typeNamespacedName, workbenchTool)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.WorkbenchTool{
					ObjectMeta: metav1.ObjectMeta{
						Name:      workbenchToolName,
						Namespace: namespace,
					},
					Spec: v1alpha1.WorkbenchToolSpec{
						Name: lo.ToPtr(workbenchToolName),
						Tool: gqlclient.WorkbenchToolTypeHTTP,
						Configuration: &v1alpha1.WorkbenchToolConfiguration{
							HTTP: &v1alpha1.WorkbenchToolHTTPConfig{
								URL:    "https://example.com",
								Method: gqlclient.WorkbenchToolHTTPMethodGet,
								InputSchema: &runtime.RawExtension{
									Raw: []byte(`{"type":"object"}`),
								},
							},
						},
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			workbenchTool := &v1alpha1.WorkbenchTool{}
			if err := k8sClient.Get(ctx, typeNamespacedName, workbenchTool); err == nil {
				By("Cleanup the specific resource instance WorkbenchTool")
				Expect(k8sClient.Delete(ctx, workbenchTool)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				workbenchToolFragment *gqlclient.WorkbenchToolFragment
				expectedStatus        v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID: lo.ToPtr("123"),
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
				workbenchToolFragment: &gqlclient.WorkbenchToolFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchToolTiny", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("GetWorkbenchTool", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("CreateWorkbenchTool", mock.Anything, mock.Anything).Return(test.workbenchToolFragment, nil)

			reconciler := &controller.WorkbenchToolReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			wt := &v1alpha1.WorkbenchTool{}
			err = k8sClient.Get(ctx, typeNamespacedName, wt)

			Expect(err).NotTo(HaveOccurred())
			Expect(wt.Status.ID).To(Equal(test.expectedStatus.ID))
			Expect(wt.Status.SHA).NotTo(BeNil())
			test.expectedStatus.SHA = wt.Status.SHA
			Expect(common.SanitizeStatusConditions(wt.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully delete the resource", func() {
			By("Delete resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.WorkbenchTool{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchToolName, Namespace: namespace},
			}, func(p *v1alpha1.WorkbenchTool) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.WorkbenchTool{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsWorkbenchToolExists", mock.Anything, mock.Anything, mock.Anything).Return(true, nil)
			fakeConsoleClient.On("DeleteWorkbenchTool", mock.Anything, mock.Anything).Return(nil)

			reconciler := &controller.WorkbenchToolReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err = reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			workbenchTool := &v1alpha1.WorkbenchTool{}
			err = k8sClient.Get(ctx, typeNamespacedName, workbenchTool)

			Expect(err.Error()).To(Equal("workbenchtools.deployments.plural.sh \"test\" not found"))
		})
	})
})
