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
			workbenchToolName     = "wt-http"
			workbenchToolSpecName = "wt_http"
			namespace             = "default"
			id                    = "123"
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
						Name: lo.ToPtr(workbenchToolSpecName),
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
				ID:  lo.ToPtr(id),
				SHA: wt.Status.SHA,
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
			Expect(err.Error()).To(Equal("workbenchtools.deployments.plural.sh \"wt-http\" not found"))
		})
	})

	Context("When reconciling a Prometheus tool with secret refs", func() {
		const (
			workbenchToolName     = "wt-prometheus"
			workbenchToolSpecName = "wt_prometheus"
			namespace             = "default"
			id                    = "prometheus-123"
			secretName            = "prometheus-creds"
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
						Name:       lo.ToPtr(workbenchToolSpecName),
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
			workbenchToolName     = "wt-mcp"
			workbenchToolSpecName = "wt_mcp"
			namespace             = "default"
			id                    = "mcp-tool-123"
			mcpServerName         = "my-mcp-server"
			mcpServerID           = "mcp-server-id-123"
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
						Name: lo.ToPtr(workbenchToolSpecName),
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
			workbenchToolSpecName = "wt_cloud"
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
						Name: lo.ToPtr(workbenchToolSpecName),
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

		It("should update when resolved CloudConnection ID changes without a spec change", func() {
			const updatedCloudConnectionID = "cloud-conn-id-456"

			wt := &v1alpha1.WorkbenchTool{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, wt)).To(Succeed())
			Expect(wt.Status.SHA).NotTo(BeNil())
			currentSHA := *wt.Status.SHA

			Expect(common.MaybePatch(k8sClient, &v1alpha1.CloudConnection{
				ObjectMeta: metav1.ObjectMeta{Name: cloudConnectionName, Namespace: namespace},
			}, func(p *v1alpha1.CloudConnection) {
				p.Status.ID = lo.ToPtr(updatedCloudConnectionID)
			})).To(Succeed())
			Expect(common.MaybePatch(k8sClient, &v1alpha1.WorkbenchTool{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchToolName, Namespace: namespace},
			}, func(p *v1alpha1.WorkbenchTool) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr(currentSHA)
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchTool", mock.Anything, mock.Anything, mock.Anything).Return(&gqlclient.WorkbenchToolFragment{
				ID: id,
				CloudConnection: &gqlclient.CloudConnectionFragment{
					ID:   cloudConnectionID,
					Name: cloudConnectionName,
				},
			}, nil)
			fakeConsoleClient.On("UpdateWorkbenchTool", mock.Anything, id, mock.MatchedBy(func(attrs gqlclient.WorkbenchToolAttributes) bool {
				return attrs.CloudConnectionID != nil && *attrs.CloudConnectionID == updatedCloudConnectionID
			})).Return(&gqlclient.WorkbenchToolFragment{ID: id}, nil)

			reconciler := &controller.WorkbenchToolReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
		})
	})

	Context("When reconciling a Docker tool with bearer auth", func() {
		const (
			workbenchToolName     = "wt-docker"
			workbenchToolSpecName = "wt_docker"
			namespace             = "default"
			id                    = "docker-tool-123"
			secretName            = "docker-creds"
			initialToken          = "initial-registry-token"
			rotatedToken          = "rotated-registry-token"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: workbenchToolName, Namespace: namespace}
		secretNamespacedName := types.NamespacedName{Name: secretName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the Docker credentials secret")
			Expect(common.MaybeCreate(k8sClient, &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      secretName,
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"token": []byte(initialToken),
				},
			}, nil)).To(Succeed())

			By("creating the Docker WorkbenchTool resource")
			err := k8sClient.Get(ctx, typeNamespacedName, &v1alpha1.WorkbenchTool{})
			if err != nil && errors.IsNotFound(err) {
				Expect(common.MaybeCreate(k8sClient, &v1alpha1.WorkbenchTool{
					ObjectMeta: metav1.ObjectMeta{
						Name:      workbenchToolName,
						Namespace: namespace,
					},
					Spec: v1alpha1.WorkbenchToolSpec{
						Name:       lo.ToPtr(workbenchToolSpecName),
						Tool:       gqlclient.WorkbenchToolTypeDocker,
						Categories: []gqlclient.WorkbenchToolCategory{gqlclient.WorkbenchToolCategoryIntegration},
						Approval:   lo.ToPtr(true),
						Configuration: &v1alpha1.WorkbenchToolConfiguration{
							Docker: &v1alpha1.WorkbenchToolDockerConfig{
								URL:      lo.ToPtr("registry-1.docker.io"),
								Provider: lo.ToPtr(gqlclient.HelmAuthProviderBearer),
								Auth: &v1alpha1.HelmRepositoryAuth{
									Proxy: &v1alpha1.HttpProxyConfiguration{
										URL:     "http://proxy.example.com:8080",
										NoProxy: lo.ToPtr("localhost,127.0.0.1"),
									},
									Bearer: &v1alpha1.HelmRepositoryAuthBearer{
										TokenSecretKeyRef: &corev1.SecretKeySelector{
											LocalObjectReference: corev1.LocalObjectReference{Name: secretName},
											Key:                  "token",
										},
									},
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
			secret := &corev1.Secret{}
			if err := k8sClient.Get(ctx, secretNamespacedName, secret); err == nil {
				Expect(k8sClient.Delete(ctx, secret)).To(Succeed())
			}
		})

		It("should resolve Docker auth, proxy, approval and own the secret", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchToolTiny", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("GetWorkbenchTool", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("CreateWorkbenchTool", mock.Anything, mock.MatchedBy(func(attrs gqlclient.WorkbenchToolAttributes) bool {
				if attrs.Approval == nil || !*attrs.Approval {
					return false
				}
				if attrs.Configuration == nil || attrs.Configuration.Docker == nil || attrs.Configuration.Docker.Auth == nil {
					return false
				}
				auth := attrs.Configuration.Docker.Auth
				if auth.Bearer == nil || auth.Bearer.Token != initialToken {
					return false
				}
				if auth.Proxy == nil || auth.Proxy.URL != "http://proxy.example.com:8080" {
					return false
				}
				return auth.Proxy.Noproxy != nil && *auth.Proxy.Noproxy == "localhost,127.0.0.1"
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
			Expect(wt.Status.SHA).NotTo(BeNil())

			secret := &corev1.Secret{}
			Expect(k8sClient.Get(ctx, secretNamespacedName, secret)).To(Succeed())
			Expect(secret.OwnerReferences).NotTo(BeEmpty())
			Expect(secret.OwnerReferences[0].Kind).To(Equal("WorkbenchTool"))
			Expect(secret.OwnerReferences[0].Name).To(Equal(workbenchToolName))
		})

		It("should update when Docker secret credentials are rotated without a spec change", func() {
			wt := &v1alpha1.WorkbenchTool{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, wt)).To(Succeed())
			Expect(wt.Status.SHA).NotTo(BeNil())
			currentSHA := *wt.Status.SHA

			secret := &corev1.Secret{}
			Expect(k8sClient.Get(ctx, secretNamespacedName, secret)).To(Succeed())
			secret.Data["token"] = []byte(rotatedToken)
			Expect(k8sClient.Update(ctx, secret)).To(Succeed())

			Expect(common.MaybePatch(k8sClient, &v1alpha1.WorkbenchTool{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchToolName, Namespace: namespace},
			}, func(p *v1alpha1.WorkbenchTool) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr(currentSHA)
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchTool", mock.Anything, mock.Anything, mock.Anything).Return(&gqlclient.WorkbenchToolFragment{ID: id}, nil)
			fakeConsoleClient.On("UpdateWorkbenchTool", mock.Anything, id, mock.MatchedBy(func(attrs gqlclient.WorkbenchToolAttributes) bool {
				return attrs.Configuration != nil &&
					attrs.Configuration.Docker != nil &&
					attrs.Configuration.Docker.Auth != nil &&
					attrs.Configuration.Docker.Auth.Bearer != nil &&
					attrs.Configuration.Docker.Auth.Bearer.Token == rotatedToken
			})).Return(&gqlclient.WorkbenchToolFragment{ID: id}, nil)

			reconciler := &controller.WorkbenchToolReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			updated := &v1alpha1.WorkbenchTool{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, updated)).To(Succeed())
			Expect(updated.Status.SHA).NotTo(BeNil())
			Expect(*updated.Status.SHA).NotTo(Equal(currentSHA))
		})
	})

	Context("When reconciling a GitHub tool with ScmConnectionRef", func() {
		const (
			workbenchToolName     = "wt-github"
			workbenchToolSpecName = "wt_github"
			namespace             = "default"
			id                    = "github-tool-123"
			scmConnectionName     = "wt-github-scm"
			scmConnectionID       = "scm-conn-id-123"
			secretName            = "github-tool-creds"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: workbenchToolName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the GitHub credentials secret")
			Expect(common.MaybeCreate(k8sClient, &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      secretName,
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"accessToken": []byte("ghp_test_token"),
				},
			}, nil)).To(Succeed())

			By("creating the ScmConnection resource with a status ID")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.ScmConnection{
				ObjectMeta: metav1.ObjectMeta{
					Name: scmConnectionName,
				},
				Spec: v1alpha1.ScmConnectionSpec{
					Name: scmConnectionName,
					Type: gqlclient.ScmTypeGithub,
				},
			}, func(p *v1alpha1.ScmConnection) {
				p.Status.ID = lo.ToPtr(scmConnectionID)
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
						Name: lo.ToPtr(workbenchToolSpecName),
						Tool: gqlclient.WorkbenchToolTypeGithub,
						Categories: []gqlclient.WorkbenchToolCategory{
							gqlclient.WorkbenchToolCategoryScm,
						},
						ScmConnectionRef: &corev1.ObjectReference{
							Name: scmConnectionName,
						},
						Bindings: &v1alpha1.Bindings{
							Read: []v1alpha1.Binding{
								{UserID: lo.ToPtr("user-read-id")},
							},
							Write: []v1alpha1.Binding{
								{UserID: lo.ToPtr("user-write-id")},
							},
						},
						Configuration: &v1alpha1.WorkbenchToolConfiguration{
							Github: &v1alpha1.WorkbenchToolGithubConfig{
								URL:     lo.ToPtr("https://api.github.com/"),
								Toolset: lo.ToPtr("default"),
								AccessTokenSecretRef: &corev1.SecretKeySelector{
									LocalObjectReference: corev1.LocalObjectReference{Name: secretName},
									Key:                  "accessToken",
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
			scm := &v1alpha1.ScmConnection{}
			if err := k8sClient.Get(ctx, types.NamespacedName{Name: scmConnectionName}, scm); err == nil {
				Expect(k8sClient.Delete(ctx, scm)).To(Succeed())
			}
			secret := &corev1.Secret{}
			if err := k8sClient.Get(ctx, types.NamespacedName{Name: secretName, Namespace: namespace}, secret); err == nil {
				Expect(k8sClient.Delete(ctx, secret)).To(Succeed())
			}
		})

		It("should resolve ScmConnectionRef, bindings and GitHub configuration", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchToolTiny", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("GetWorkbenchTool", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("CreateWorkbenchTool", mock.Anything, mock.MatchedBy(func(attrs gqlclient.WorkbenchToolAttributes) bool {
				if attrs.ScmConnectionID == nil || *attrs.ScmConnectionID != scmConnectionID {
					return false
				}
				if len(attrs.ReadBindings) != 1 || attrs.ReadBindings[0].UserID == nil || *attrs.ReadBindings[0].UserID != "user-read-id" {
					return false
				}
				if len(attrs.WriteBindings) != 1 || attrs.WriteBindings[0].UserID == nil || *attrs.WriteBindings[0].UserID != "user-write-id" {
					return false
				}
				if attrs.Configuration == nil || attrs.Configuration.Github == nil {
					return false
				}
				return attrs.Configuration.Github.AccessToken != nil && *attrs.Configuration.Github.AccessToken == "ghp_test_token"
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

	Context("When reconciling Prometheus secret rotation", func() {
		const (
			workbenchToolName     = "wt-prometheus-rotate"
			workbenchToolSpecName = "wt_prometheus_rotate"
			namespace             = "default"
			id                    = "prometheus-rotate-123"
			secretName            = "prometheus-rotate-creds"
			initialToken          = "prom-token-v1"
			rotatedToken          = "prom-token-v2"
		)

		ctx := context.Background()
		typeNamespacedName := types.NamespacedName{Name: workbenchToolName, Namespace: namespace}
		secretNamespacedName := types.NamespacedName{Name: secretName, Namespace: namespace}

		BeforeAll(func() {
			By("creating the Prometheus credentials secret")
			Expect(common.MaybeCreate(k8sClient, &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      secretName,
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"token": []byte(initialToken),
				},
			}, nil)).To(Succeed())

			By("creating the Prometheus WorkbenchTool resource")
			err := k8sClient.Get(ctx, typeNamespacedName, &v1alpha1.WorkbenchTool{})
			if err != nil && errors.IsNotFound(err) {
				Expect(common.MaybeCreate(k8sClient, &v1alpha1.WorkbenchTool{
					ObjectMeta: metav1.ObjectMeta{
						Name:      workbenchToolName,
						Namespace: namespace,
					},
					Spec: v1alpha1.WorkbenchToolSpec{
						Name: lo.ToPtr(workbenchToolSpecName),
						Tool: gqlclient.WorkbenchToolTypePrometheus,
						Configuration: &v1alpha1.WorkbenchToolConfiguration{
							Prometheus: &v1alpha1.WorkbenchToolPrometheusConfig{
								URL: "https://prometheus.example.com",
								TokenSecretRef: &corev1.SecretKeySelector{
									LocalObjectReference: corev1.LocalObjectReference{Name: secretName},
									Key:                  "token",
								},
								AWSSigv4:  lo.ToPtr(true),
								AWSRegion: lo.ToPtr("us-east-1"),
							},
						},
					},
				}, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			workbenchTool := &v1alpha1.WorkbenchTool{}
			if err := k8sClient.Get(ctx, typeNamespacedName, workbenchTool); err == nil {
				Expect(k8sClient.Delete(ctx, workbenchTool)).To(Succeed())
			}
			secret := &corev1.Secret{}
			if err := k8sClient.Get(ctx, secretNamespacedName, secret); err == nil {
				Expect(k8sClient.Delete(ctx, secret)).To(Succeed())
			}
		})

		It("should create with resolved Prometheus secrets and AWS SigV4 fields", func() {
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchToolTiny", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("GetWorkbenchTool", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("CreateWorkbenchTool", mock.Anything, mock.MatchedBy(func(attrs gqlclient.WorkbenchToolAttributes) bool {
				if attrs.Configuration == nil || attrs.Configuration.Prometheus == nil {
					return false
				}
				prom := attrs.Configuration.Prometheus
				return prom.Token != nil && *prom.Token == initialToken &&
					prom.AWSSigv4 != nil && *prom.AWSSigv4 &&
					prom.AWSRegion != nil && *prom.AWSRegion == "us-east-1"
			})).Return(&gqlclient.WorkbenchToolFragment{ID: id}, nil)

			reconciler := &controller.WorkbenchToolReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
		})

		It("should update when Prometheus secret credentials are rotated without a spec change", func() {
			wt := &v1alpha1.WorkbenchTool{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, wt)).To(Succeed())
			Expect(wt.Status.SHA).NotTo(BeNil())
			currentSHA := *wt.Status.SHA

			secret := &corev1.Secret{}
			Expect(k8sClient.Get(ctx, secretNamespacedName, secret)).To(Succeed())
			secret.Data["token"] = []byte(rotatedToken)
			Expect(k8sClient.Update(ctx, secret)).To(Succeed())

			Expect(common.MaybePatch(k8sClient, &v1alpha1.WorkbenchTool{
				ObjectMeta: metav1.ObjectMeta{Name: workbenchToolName, Namespace: namespace},
			}, func(p *v1alpha1.WorkbenchTool) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr(currentSHA)
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetWorkbenchTool", mock.Anything, mock.Anything, mock.Anything).Return(&gqlclient.WorkbenchToolFragment{ID: id}, nil)
			fakeConsoleClient.On("UpdateWorkbenchTool", mock.Anything, id, mock.MatchedBy(func(attrs gqlclient.WorkbenchToolAttributes) bool {
				return attrs.Configuration != nil &&
					attrs.Configuration.Prometheus != nil &&
					attrs.Configuration.Prometheus.Token != nil &&
					*attrs.Configuration.Prometheus.Token == rotatedToken
			})).Return(&gqlclient.WorkbenchToolFragment{ID: id}, nil)

			reconciler := &controller.WorkbenchToolReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: nil,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			updated := &v1alpha1.WorkbenchTool{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, updated)).To(Succeed())
			Expect(updated.Status.SHA).NotTo(BeNil())
			Expect(*updated.Status.SHA).NotTo(Equal(currentSHA))
		})
	})
})
