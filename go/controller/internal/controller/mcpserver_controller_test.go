package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("MCP Server Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			mcpServerName = "test"
			namespace     = "default"
			id            = "123"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: mcpServerName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the custom resource for the Kind MCP Server")
			mcpServer := &v1alpha1.MCPServer{}
			err := k8sClient.Get(ctx, typeNamespacedName, mcpServer)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.MCPServer{
					ObjectMeta: metav1.ObjectMeta{
						Name:      mcpServerName,
						Namespace: namespace,
					},
					Spec: v1alpha1.MCPServerSpec{
						Name: lo.ToPtr(mcpServerName),
						URL:  "test.url.com",
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			mcpServer := &v1alpha1.MCPServer{}
			if err := k8sClient.Get(ctx, typeNamespacedName, mcpServer); err == nil {
				By("Cleanup the specific resource instance MCP Server")
				Expect(k8sClient.Delete(ctx, mcpServer)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				mcpServerFragment *gqlclient.MCPServerFragment
				expectedStatus    v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("K76A44RDYVFANGBBOEJWRQQX7TRA4JGI2IM37CIARUS57BUMZ7TQ===="),
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
				mcpServerFragment: &gqlclient.MCPServerFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetMCPServer", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("UpsertMCPServer", mock.Anything, mock.Anything).Return(test.mcpServerFragment, nil)

			reconciler := &controller.MCPServerReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			flw := &v1alpha1.MCPServer{}
			err = k8sClient.Get(ctx, typeNamespacedName, flw)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(flw.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile the resource", func() {
			By("Delete resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.MCPServer{
				ObjectMeta: metav1.ObjectMeta{Name: mcpServerName, Namespace: namespace},
			}, func(p *v1alpha1.MCPServer) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.MCPServer{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			mcpServerFragment := &gqlclient.MCPServerFragment{
				ID: id,
			}
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetMCPServer", mock.Anything, mock.Anything, mock.Anything).Return(mcpServerFragment, nil)
			fakeConsoleClient.On("DeleteMCPServer", mock.Anything, mock.Anything).Return(nil)

			reconciler := &controller.MCPServerReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			mcpServer := &v1alpha1.MCPServer{}
			err = k8sClient.Get(ctx, typeNamespacedName, mcpServer)

			Expect(err.Error()).To(Equal("mcpservers.deployments.plural.sh \"test\" not found"))
		})

	})

})
