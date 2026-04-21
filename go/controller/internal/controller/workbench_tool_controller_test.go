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

var _ = Describe("Workbench Tool Controller", Ordered, func() {
	Context("When reconciling an HTTP tool", func() {
		const (
			workbenchToolName = "wt_http"
			namespace         = "default"
			id                = "123"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: workbenchToolName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the WorkbenchTool resource")
			workbenchTool := &v1alpha1.WorkbenchTool{}
			err := k8sClient.Get(ctx, typeNamespacedName, workbenchTool)
			if err != nil && errors.IsNotFound(err) {
				Expect(common.MaybeCreate(k8sClient, &v1alpha1.WorkbenchTool{
					ObjectMeta: metav1.ObjectMeta{
						Name:      workbenchToolName,
						Namespace: namespace,
					},
					Spec: v1alpha1.WorkbenchToolSpec{
						Name: lo.ToPtr(workbenchToolName),
						Tool: gqlclient.WorkbenchToolTypeHTTP,
						Configuration: &v1alpha1.WorkbenchToolConfiguration{
							HTTP: &v1alpha1.WorkbenchToolHTTPConfig{
								URL:    "https://example.com/api",
								Method: gqlclient.WorkbenchToolHTTPMethodGet,
								InputSchema: &runtime.RawExtension{
									Raw: []byte(`{"type":"object","properties":{"endpoint":{"type":"string"}}}`),
								},
							},
						},
					},
				}, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			workbenchTool := &v1alpha1.WorkbenchTool{}
			if err := k8sClient.Get(ctx, typeNamespacedName, workbenchTool); err == nil {
				By("cleaning up WorkbenchTool")
				Expect(k8sClient.Delete(ctx, workbenchTool)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchToolTiny", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("GetWorkbenchTool", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("CreateWorkbenchTool", mock.Anything, mock.Anything).Return(&gqlclient.WorkbenchToolFragment{ID: id}, nil)

			reconciler := &controller.WorkbenchToolReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			wt := &v1alpha1.WorkbenchTool{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, wt)).To(Succeed())
			Expect(wt.Status.ID).To(Equal(lo.ToPtr(id)))
			Expect(wt.Status.SHA).NotTo(BeNil())
			Expect(common.SanitizeStatusConditions(wt.Status)).To(Equal(common.SanitizeStatusConditions(v1alpha1.Status{
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
			})))
		})

		It("should successfully delete the resource", func() {
			Expect(common.MaybePatch(k8sClient, &v1alpha1.WorkbenchTool{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchToolName, Namespace: namespace},
			}, func(p *v1alpha1.WorkbenchTool) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())

			resource := &v1alpha1.WorkbenchTool{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, resource)).To(Succeed())
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())

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

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			workbenchTool := &v1alpha1.WorkbenchTool{}
			err = k8sClient.Get(ctx, typeNamespacedName, workbenchTool)
			Expect(err.Error()).To(Equal("workbenchtools.deployments.plural.sh \"wt_http\" not found"))
		})
	})

	Context("When reconciling a Prometheus tool with secret refs", func() {
		const (
			workbenchToolName = "wt-prometheus"
			namespace         = "default"
			id                = "prometheus-123"
			secretName        = "prometheus-creds"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: workbenchToolName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the credentials secret")
			Expect(common.MaybeCreate(k8sClient, &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      secretName,
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"token":    []byte("prom-bearer-token"),
					"password": []byte("prom-password"),
				},
			}, nil)).To(Succeed())

			By("creating the WorkbenchTool resource")
			err := k8sClient.Get(ctx, typeNamespacedName, &v1alpha1.WorkbenchTool{})
			if err != nil && errors.IsNotFound(err) {
				Expect(common.MaybeCreate(k8sClient, &v1alpha1.WorkbenchTool{
					ObjectMeta: metav1.ObjectMeta{
						Name:      workbenchToolName,
						Namespace: namespace,
					},
					Spec: v1alpha1.WorkbenchToolSpec{
						Name:       lo.ToPtr(workbenchToolName),
						Tool:       gqlclient.WorkbenchToolTypePrometheus,
						Categories: []gqlclient.WorkbenchToolCategory{gqlclient.WorkbenchToolCategoryMetrics},
						Configuration: &v1alpha1.WorkbenchToolConfiguration{
							Prometheus: &v1alpha1.WorkbenchToolPrometheusConfig{
								URL:      "https://prometheus.example.com",
								Username: lo.ToPtr("admin"),
								TokenSecretRef: &corev1.SecretKeySelector{
									LocalObjectReference: corev1.LocalObjectReference{Name: secretName},
									Key:                  "token",
								},
								PasswordSecretRef: &corev1.SecretKeySelector{
									LocalObjectReference: corev1.LocalObjectReference{Name: secretName},
									Key:                  "password",
								},
								TenantID: lo.ToPtr("my-tenant"),
							},
						},
					},
				}, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			workbenchTool := &v1alpha1.WorkbenchTool{}
			if err := k8sClient.Get(ctx, typeNamespacedName, workbenchTool); err == nil {
				By("cleaning up WorkbenchTool")
				Expect(k8sClient.Delete(ctx, workbenchTool)).To(Succeed())
			}
			secret := &corev1.Secret{}
			if err := k8sClient.Get(ctx, types.NamespacedName{Name: secretName, Namespace: namespace}, secret); err == nil {
				Expect(k8sClient.Delete(ctx, secret)).To(Succeed())
			}
		})

		It("should successfully reconcile with secret resolution", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchToolTiny", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("GetWorkbenchTool", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("CreateWorkbenchTool", mock.Anything, mock.Anything).Return(&gqlclient.WorkbenchToolFragment{ID: id}, nil)

			reconciler := &controller.WorkbenchToolReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			wt := &v1alpha1.WorkbenchTool{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, wt)).To(Succeed())
			Expect(wt.Status.ID).To(Equal(lo.ToPtr(id)))
			Expect(wt.Status.SHA).NotTo(BeNil())
		})
	})

	Context("When reconciling an MCP tool with MCPServerRef", func() {
		const (
			workbenchToolName = "wt-mcp"
			namespace         = "default"
			id                = "mcp-tool-123"
			mcpServerName     = "my-mcp-server"
			mcpServerID       = "mcp-server-id-123"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: workbenchToolName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the MCPServer resource with a status ID")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.MCPServer{
				ObjectMeta: metav1.ObjectMeta{
					Name:      mcpServerName,
					Namespace: namespace,
				},
				Spec: v1alpha1.MCPServerSpec{
					URL: "https://mcp.example.com",
				},
			}, func(p *v1alpha1.MCPServer) {
				p.Status.ID = lo.ToPtr(mcpServerID)
			})).To(Succeed())

			By("creating the WorkbenchTool resource")
			err := k8sClient.Get(ctx, typeNamespacedName, &v1alpha1.WorkbenchTool{})
			if err != nil && errors.IsNotFound(err) {
				Expect(common.MaybeCreate(k8sClient, &v1alpha1.WorkbenchTool{
					ObjectMeta: metav1.ObjectMeta{
						Name:      workbenchToolName,
						Namespace: namespace,
					},
					Spec: v1alpha1.WorkbenchToolSpec{
						Name: lo.ToPtr(workbenchToolName),
						Tool: gqlclient.WorkbenchToolTypeMcp,
						MCPServerRef: &corev1.ObjectReference{
							Name:      mcpServerName,
							Namespace: namespace,
						},
					},
				}, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			workbenchTool := &v1alpha1.WorkbenchTool{}
			if err := k8sClient.Get(ctx, typeNamespacedName, workbenchTool); err == nil {
				By("cleaning up WorkbenchTool")
				Expect(k8sClient.Delete(ctx, workbenchTool)).To(Succeed())
			}
			mcpServer := &v1alpha1.MCPServer{}
			if err := k8sClient.Get(ctx, types.NamespacedName{Name: mcpServerName, Namespace: namespace}, mcpServer); err == nil {
				Expect(k8sClient.Delete(ctx, mcpServer)).To(Succeed())
			}
		})

		It("should resolve MCPServerRef and reconcile successfully", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchToolTiny", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("GetWorkbenchTool", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("CreateWorkbenchTool", mock.Anything, mock.MatchedBy(func(attrs gqlclient.WorkbenchToolAttributes) bool {
				return attrs.McpServerID != nil && *attrs.McpServerID == mcpServerID
			})).Return(&gqlclient.WorkbenchToolFragment{ID: id}, nil)

			reconciler := &controller.WorkbenchToolReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			wt := &v1alpha1.WorkbenchTool{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, wt)).To(Succeed())
			Expect(wt.Status.ID).To(Equal(lo.ToPtr(id)))
		})
	})

	Context("When reconciling a Cloud tool with CloudConnectionRef", func() {
		const (
			workbenchToolName     = "wt-cloud"
			namespace             = "default"
			id                    = "cloud-tool-123"
			cloudConnectionName   = "my-cloud-connection"
			cloudConnectionID     = "cloud-conn-id-123"
			cloudConnectionSecret = "cloud-conn-secret"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: workbenchToolName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the CloudConnection secret")
			Expect(common.MaybeCreate(k8sClient, &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      cloudConnectionSecret,
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"secretAccessKey": []byte("aws-secret-key"),
				},
			}, nil)).To(Succeed())

			By("creating the CloudConnection resource with a status ID")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.CloudConnection{
				ObjectMeta: metav1.ObjectMeta{
					Name:      cloudConnectionName,
					Namespace: namespace,
				},
				Spec: v1alpha1.CloudConnectionSpec{
					Name:     lo.ToPtr(cloudConnectionName),
					Provider: v1alpha1.AWS,
					Configuration: v1alpha1.CloudConnectionConfiguration{
						AWS: &v1alpha1.AWSCloudConnection{
							AccessKeyId: "AKIAIOSFODNN7EXAMPLE",
							SecretAccessKey: v1alpha1.ObjectKeyReference{
								Name:      cloudConnectionSecret,
								Namespace: namespace,
								Key:       "secretAccessKey",
							},
							Region: lo.ToPtr("us-east-1"),
						},
					},
				},
			}, func(p *v1alpha1.CloudConnection) {
				p.Status.ID = lo.ToPtr(cloudConnectionID)
			})).To(Succeed())

			By("creating the WorkbenchTool resource")
			err := k8sClient.Get(ctx, typeNamespacedName, &v1alpha1.WorkbenchTool{})
			if err != nil && errors.IsNotFound(err) {
				Expect(common.MaybeCreate(k8sClient, &v1alpha1.WorkbenchTool{
					ObjectMeta: metav1.ObjectMeta{
						Name:      workbenchToolName,
						Namespace: namespace,
					},
					Spec: v1alpha1.WorkbenchToolSpec{
						Name: lo.ToPtr(workbenchToolName),
						Tool: gqlclient.WorkbenchToolTypeCloud,
						CloudConnectionRef: &corev1.ObjectReference{
							Name:      cloudConnectionName,
							Namespace: namespace,
						},
					},
				}, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			workbenchTool := &v1alpha1.WorkbenchTool{}
			if err := k8sClient.Get(ctx, typeNamespacedName, workbenchTool); err == nil {
				By("cleaning up WorkbenchTool")
				Expect(k8sClient.Delete(ctx, workbenchTool)).To(Succeed())
			}
			cloudConn := &v1alpha1.CloudConnection{}
			if err := k8sClient.Get(ctx, types.NamespacedName{Name: cloudConnectionName, Namespace: namespace}, cloudConn); err == nil {
				Expect(k8sClient.Delete(ctx, cloudConn)).To(Succeed())
			}
			secret := &corev1.Secret{}
			if err := k8sClient.Get(ctx, types.NamespacedName{Name: cloudConnectionSecret, Namespace: namespace}, secret); err == nil {
				Expect(k8sClient.Delete(ctx, secret)).To(Succeed())
			}
		})

		It("should resolve CloudConnectionRef and reconcile successfully", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchToolTiny", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("GetWorkbenchTool", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("CreateWorkbenchTool", mock.Anything, mock.MatchedBy(func(attrs gqlclient.WorkbenchToolAttributes) bool {
				return attrs.CloudConnectionID != nil && *attrs.CloudConnectionID == cloudConnectionID
			})).Return(&gqlclient.WorkbenchToolFragment{ID: id}, nil)

			reconciler := &controller.WorkbenchToolReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			wt := &v1alpha1.WorkbenchTool{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, wt)).To(Succeed())
			Expect(wt.Status.ID).To(Equal(lo.ToPtr(id)))
		})
	})
})
