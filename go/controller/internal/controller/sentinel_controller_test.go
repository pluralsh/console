package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/pluralsh/console/go/controller/internal/controller"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
)

var _ = Describe("Sentinel Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			name        = "test"
			namespace   = "default"
			id          = "123"
			clusterName = "cluster-test-sentinel"
			repoName    = "repo-test-sentinel"
			projectName = "default-project-sentinel"
			secretName  = "secret-test-sentinel"
			repoUrl     = "https://test"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      name,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind Secret")
			secret := &v1.Secret{}
			err := k8sClient.Get(ctx, types.NamespacedName{Name: secretName, Namespace: namespace}, secret)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1.Secret{
					ObjectMeta: metav1.ObjectMeta{Name: secretName, Namespace: namespace},
					Data:       map[string][]byte{"key": []byte("test")},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}

			By("creating the custom resource for the Kind Sentinel")
			sc := &v1alpha1.Sentinel{}
			err = k8sClient.Get(ctx, typeNamespacedName, sc)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.Sentinel{
					ObjectMeta: metav1.ObjectMeta{
						Name:      name,
						Namespace: namespace,
					},
					Spec: v1alpha1.SentinelSpec{
						Name:        lo.ToPtr(name),
						Description: lo.ToPtr("A test sentinel"),
						RepositoryRef: &v1.ObjectReference{
							Name:      repoName,
							Namespace: namespace,
						},
						ProjectRef: &v1.ObjectReference{
							Name:      projectName,
							Namespace: namespace,
						},
						Git: &v1alpha1.GitRef{
							Ref:    "main",
							Folder: "sentinels/test",
						},
						Checks: []v1alpha1.SentinelCheck{
							{
								Type: gqlclient.SentinelCheckTypeLog,
								Name: "test",
								Configuration: &v1alpha1.SentinelCheckConfiguration{
									Log: &v1alpha1.SentinelCheckLogConfiguration{
										Query:    "abc",
										Duration: "test",
										Facets:   map[string]string{"a": "b", "c": "d"},
									},
								},
							},
						},
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
			By("creating the custom resource for the Kind Cluster")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{Name: clusterName, Namespace: namespace},
				Spec: v1alpha1.ClusterSpec{
					Cloud: "aws",
				},
			}, func(p *v1alpha1.Cluster) {
				p.Status.ID = lo.ToPtr(id)
			})).To(Succeed())
			By("creating the custom resource for the Kind Repository")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.GitRepository{
				ObjectMeta: metav1.ObjectMeta{Name: repoName, Namespace: namespace},
				Spec: v1alpha1.GitRepositorySpec{
					Url: repoUrl,
				},
			}, func(p *v1alpha1.GitRepository) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.Health = v1alpha1.GitHealthPullable
			})).To(Succeed())
			By("creating the custom resource for the Kind Project")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Project{
				ObjectMeta: metav1.ObjectMeta{Name: projectName, Namespace: namespace},
				Spec: v1alpha1.ProjectSpec{
					Name: "default",
				},
			}, func(p *v1alpha1.Project) {
				p.Status.ID = lo.ToPtr(id)
			})).To(Succeed())
		})

		AfterAll(func() {
			resource := &v1alpha1.Cluster{}
			err := k8sClient.Get(ctx, types.NamespacedName{Name: clusterName, Namespace: namespace}, resource)
			Expect(err).NotTo(HaveOccurred())
			By("Cleanup the specific resource instance Cluster")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())
			repo := &v1alpha1.GitRepository{}
			err = k8sClient.Get(ctx, types.NamespacedName{Name: repoName, Namespace: namespace}, repo)
			Expect(err).NotTo(HaveOccurred())
			By("Cleanup the specific resource instance Repository")
			Expect(k8sClient.Delete(ctx, repo)).To(Succeed())
			sc := &v1alpha1.Sentinel{}
			if err := k8sClient.Get(ctx, typeNamespacedName, sc); err == nil {
				By("Cleanup the specific resource instance Sentinel")
				Expect(k8sClient.Delete(ctx, sc)).To(Succeed())
			}
			By("Cleanup the specific resource instance Project")
			project := &v1alpha1.Project{}
			if err := k8sClient.Get(ctx, types.NamespacedName{Name: projectName, Namespace: namespace}, project); err == nil {
				By("Cleanup the specific resource instance Project")
				Expect(k8sClient.Delete(ctx, project)).To(Succeed())
			}
		})

		//It("should successfully reconcile the resource", func() {
		//	By("Create resource")
		//	test := struct {
		//		fragment       *gqlclient.SentinelFragment
		//		expectedStatus v1alpha1.Status
		//	}{
		//		expectedStatus: v1alpha1.Status{
		//			ID:  lo.ToPtr("123"),
		//			SHA: lo.ToPtr("OJQLAC2NZOG6F6V3BD22JYEJGPNG3PH2MZJ6OURS44C3D3KJKJLQ===="),
		//			Conditions: []metav1.Condition{
		//				{
		//					Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
		//					Status:  metav1.ConditionFalse,
		//					Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
		//					Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
		//				},
		//				{
		//					Type:    v1alpha1.ReadyConditionType.String(),
		//					Status:  metav1.ConditionTrue,
		//					Reason:  v1alpha1.ReadyConditionReason.String(),
		//					Message: "",
		//				},
		//				{
		//					Type:   v1alpha1.SynchronizedConditionType.String(),
		//					Status: metav1.ConditionTrue,
		//					Reason: v1alpha1.SynchronizedConditionReason.String(),
		//				},
		//			},
		//		},
		//		fragment: &gqlclient.SentinelFragment{
		//			ID: id,
		//		},
		//	}
		//
		//	fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
		//	fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
		//	fakeConsoleClient.On("CreateSentinel", mock.Anything, mock.Anything).Return(test.fragment, nil)
		//
		//	nr := &controller.SentinelReconciler{
		//		Client:        k8sClient,
		//		Scheme:        k8sClient.Scheme(),
		//		ConsoleClient: fakeConsoleClient,
		//	}
		//
		//	_, err := nr.Reconcile(ctx, reconcile.Request{
		//		NamespacedName: typeNamespacedName,
		//	})
		//
		//	Expect(err).NotTo(HaveOccurred())
		//
		//	f := &v1alpha1.Sentinel{}
		//	err = k8sClient.Get(ctx, typeNamespacedName, f)
		//
		//	Expect(err).NotTo(HaveOccurred())
		//	Expect(common.SanitizeStatusConditions(f.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		//})

		It("should successfully reconcile the resource with integration test cases", func() {
			By("Create resource with integration test cases")
			const (
				integrationTestName      = "test-integration"
				integrationTestNamespace = "default"
			)

			integrationTestTypeNamespacedName := types.NamespacedName{
				Name:      integrationTestName,
				Namespace: integrationTestNamespace,
			}

			By("creating the custom resource for the Kind Sentinel with integration test cases")
			sc := &v1alpha1.Sentinel{}
			err := k8sClient.Get(ctx, integrationTestTypeNamespacedName, sc)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.Sentinel{
					ObjectMeta: metav1.ObjectMeta{
						Name:      integrationTestName,
						Namespace: integrationTestNamespace,
					},
					Spec: v1alpha1.SentinelSpec{
						Name:        lo.ToPtr(integrationTestName),
						Description: lo.ToPtr("A test sentinel with integration test cases"),
						RepositoryRef: &v1.ObjectReference{
							Name:      repoName,
							Namespace: namespace,
						},
						ProjectRef: &v1.ObjectReference{
							Name:      projectName,
							Namespace: namespace,
						},
						Git: &v1alpha1.GitRef{
							Ref:    "main",
							Folder: "sentinels/integration-test",
						},
						Checks: []v1alpha1.SentinelCheck{
							{
								Type: gqlclient.SentinelCheckTypeIntegrationTest,
								Name: "integration-test-check",
								Configuration: &v1alpha1.SentinelCheckConfiguration{
									IntegrationTest: &v1alpha1.SentinelCheckIntegrationTestConfiguration{
										Format: gqlclient.SentinelRunJobFormatJunit,
										Distro: lo.ToPtr(gqlclient.ClusterDistroEks),
										Tags:   map[string]string{"env": "test", "region": "us-east-1"},
										RepositoryRef: &v1.ObjectReference{
											Name:      repoName,
											Namespace: namespace,
										},
										Git: &v1alpha1.GitRef{
											Ref:    "main",
											Folder: "tests",
										},
										Gotestsum: &v1alpha1.SentinelCheckGotestsumConfiguration{
											P:        lo.ToPtr("4"),
											Parallel: lo.ToPtr("8"),
										},
										Cases: []v1alpha1.SentinelCheckIntegrationTestCase{
											{
												Type: gqlclient.SentinelIntegrationTestCaseTypeCoredns,
												Name: "coredns-test",
												Coredns: &v1alpha1.SentinelCheckIntegrationTestCaseCoredns{
													DialFqdns: []string{"kubernetes.default.svc.cluster.local", "google.com"},
												},
											},
											{
												Type: gqlclient.SentinelIntegrationTestCaseTypeLoadbalancer,
												Name: "loadbalancer-test",
												Loadbalancer: &v1alpha1.SentinelCheckIntegrationTestCaseLoadbalancer{
													Namespace:   "default",
													NamePrefix:  "test-lb",
													Labels:      map[string]string{"app": "test", "tier": "frontend"},
													Annotations: map[string]string{"service.beta.kubernetes.io/aws-load-balancer-type": "nlb"},
												},
											},
											{
												Type: gqlclient.SentinelIntegrationTestCaseTypeRaw,
												Name: "raw-test",
												Raw: &runtime.RawExtension{
													Raw: []byte(`{"apiVersion":"v1","kind":"ConfigMap","metadata":{"name":"test-config"},"data":{"key":"value"}}`),
												},
											},
										},
									},
								},
							},
						},
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}

			test := struct {
				fragment       *gqlclient.SentinelFragment
				expectedStatus v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("456"),
					SHA: lo.ToPtr("WBF5EFZQ5I6IITKQD7VEIGYDM3I4V6QKWMPSFZJKW7VJVQN7GJSQ===="),
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
				fragment: &gqlclient.SentinelFragment{
					ID: "456",
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("CreateSentinel", mock.Anything, mock.Anything).Return(test.fragment, nil)

			nr := &controller.SentinelReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = nr.Reconcile(ctx, reconcile.Request{
				NamespacedName: integrationTestTypeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			f := &v1alpha1.Sentinel{}
			err = k8sClient.Get(ctx, integrationTestTypeNamespacedName, f)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(f.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))

			By("Cleanup the specific resource instance Sentinel")
			Expect(k8sClient.Delete(ctx, f)).To(Succeed())
		})
	})
})
