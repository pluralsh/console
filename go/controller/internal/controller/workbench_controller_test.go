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

var _ = Describe("Workbench Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			workbenchName    = "test"
			namespace        = "default"
			id               = "123"
			clusterHandle    = "test-cluster"
			agentRuntimeName = "test-agent-runtime"
			agentRuntimeID   = "agent-runtime-123"
			clusterID        = "cluster-123"
			tool1Name        = "workbenchtool1"
			tool2Name        = "workbenchtool2"
			tool1ID          = "tool-id-1"
			tool2ID          = "tool-id-2"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: workbenchName, Namespace: namespace}
		tool1NamespacedName := types.NamespacedName{Name: tool1Name, Namespace: namespace}
		tool2NamespacedName := types.NamespacedName{Name: tool2Name, Namespace: namespace}

		BeforeAll(func() {
			By("creating the WorkbenchTool resources")
			for _, tc := range []struct {
				name string
				id   string
			}{
				{tool1Name, tool1ID},
				{tool2Name, tool2ID},
			} {
				tool := &v1alpha1.WorkbenchTool{}
				err := k8sClient.Get(ctx, types.NamespacedName{Name: tc.name, Namespace: namespace}, tool)
				if err != nil && errors.IsNotFound(err) {
					resource := &v1alpha1.WorkbenchTool{
						ObjectMeta: metav1.ObjectMeta{Name: tc.name, Namespace: namespace},
						Spec: v1alpha1.WorkbenchToolSpec{
							Name: lo.ToPtr(tc.name),
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
				Expect(common.MaybePatch(k8sClient, &v1alpha1.WorkbenchTool{
					ObjectMeta: metav1.ObjectMeta{Name: tc.name, Namespace: namespace},
				}, func(p *v1alpha1.WorkbenchTool) {
					p.Status.ID = lo.ToPtr(tc.id)
				})).To(Succeed())
			}

			By("creating the custom resource for the Kind Workbench")
			workbench := &v1alpha1.Workbench{}
			err := k8sClient.Get(ctx, typeNamespacedName, workbench)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.Workbench{
					ObjectMeta: metav1.ObjectMeta{
						Name:      workbenchName,
						Namespace: namespace,
					},
					Spec: v1alpha1.WorkbenchSpec{
						Name:         lo.ToPtr(workbenchName),
						AgentRuntime: lo.ToPtr(clusterHandle + "/" + agentRuntimeName),
						ToolRefs: []corev1.ObjectReference{
							{Name: tool1Name, Namespace: namespace},
							{Name: tool2Name, Namespace: namespace},
						},
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			workbench := &v1alpha1.Workbench{}
			if err := k8sClient.Get(ctx, typeNamespacedName, workbench); err == nil {
				By("Cleanup the specific resource instance Workbench")
				Expect(k8sClient.Delete(ctx, workbench)).To(Succeed())
			}
			for _, nn := range []types.NamespacedName{tool1NamespacedName, tool2NamespacedName} {
				tool := &v1alpha1.WorkbenchTool{}
				if err := k8sClient.Get(ctx, nn, tool); err == nil {
					Expect(k8sClient.Delete(ctx, tool)).To(Succeed())
				}
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				workbenchFragment *gqlclient.WorkbenchFragment
				expectedStatus    v1alpha1.Status
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
				workbenchFragment: &gqlclient.WorkbenchFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchTiny", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("GetWorkbench", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("GetClusterByHandle", lo.ToPtr(clusterHandle)).Return(&gqlclient.ClusterFragment{ID: clusterID, Handle: lo.ToPtr(clusterHandle)}, nil)
			fakeConsoleClient.On("GetAgentRuntime", mock.Anything, agentRuntimeName, clusterID).Return(&gqlclient.AgentRuntimeFragment{ID: agentRuntimeID, Name: agentRuntimeName}, nil)
			fakeConsoleClient.On("CreateWorkbench", mock.Anything, mock.Anything).Return(test.workbenchFragment, nil)

			reconciler := &controller.WorkbenchReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			wb := &v1alpha1.Workbench{}
			err = k8sClient.Get(ctx, typeNamespacedName, wb)

			Expect(err).NotTo(HaveOccurred())
			Expect(wb.Status.ID).To(Equal(test.expectedStatus.ID))
			Expect(wb.Status.SHA).NotTo(BeNil())
			test.expectedStatus.SHA = wb.Status.SHA
			Expect(common.SanitizeStatusConditions(wb.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully delete the resource", func() {
			By("Delete resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Workbench{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchName, Namespace: namespace},
			}, func(p *v1alpha1.Workbench) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.Workbench{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsWorkbenchExists", mock.Anything, mock.Anything, mock.Anything).Return(true, nil)
			fakeConsoleClient.On("DeleteWorkbench", mock.Anything, mock.Anything).Return(nil)

			reconciler := &controller.WorkbenchReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err = reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			workbench := &v1alpha1.Workbench{}
			err = k8sClient.Get(ctx, typeNamespacedName, workbench)

			Expect(err.Error()).To(Equal("workbenches.deployments.plural.sh \"test\" not found"))
		})
	})
})
