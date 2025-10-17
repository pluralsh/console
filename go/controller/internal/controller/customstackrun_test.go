package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("Custom Stack Run Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			stackName   = "custom-stack-test"
			clusterName = "cluster-test"
			repoName    = "repo-test"
			namespace   = "default"
			id          = "123"
			repoUrl     = "https://test"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      stackName,
			Namespace: namespace,
		}

		BeforeAll(func() {
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

			By("creating the custom resource for the Kind InfrastructureStack")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.InfrastructureStack{
				ObjectMeta: metav1.ObjectMeta{Name: stackName, Namespace: namespace},
				Spec: v1alpha1.InfrastructureStackSpec{
					Name: lo.ToPtr(stackName),
					Type: gqlclient.StackTypeTerraform,
					RepositoryRef: corev1.ObjectReference{
						Name:      repoName,
						Namespace: namespace,
					},
					ClusterRef: corev1.ObjectReference{
						Name:      clusterName,
						Namespace: namespace,
					},
					Git: v1alpha1.GitRef{
						Ref:    "main",
						Folder: "terraform",
					},
					Configuration: &v1alpha1.StackConfiguration{
						Version: lo.ToPtr("v0.0.1"),
					},
				},
			}, nil)).To(Succeed())

			By("creating the custom resource for the Kind CustomStackRun")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.CustomStackRun{
				ObjectMeta: metav1.ObjectMeta{Name: stackName, Namespace: namespace},
				Spec: v1alpha1.CustomStackRunSpec{
					Name: lo.ToPtr(stackName),
					StackRef: &corev1.LocalObjectReference{
						Name: stackName,
					},
				},
			}, nil)).To(Succeed())
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

			stack := &v1alpha1.InfrastructureStack{}
			err = k8sClient.Get(ctx, typeNamespacedName, stack)
			if err == nil {
				By("Cleanup the specific resource instance InfrastructureStack")
				Expect(k8sClient.Delete(ctx, stack)).To(Succeed())
			}

			customStack := &v1alpha1.CustomStackRun{}
			err = k8sClient.Get(ctx, typeNamespacedName, customStack)
			if err == nil {
				By("Cleanup the specific resource instance CustomStackRun")
				Expect(k8sClient.Delete(ctx, customStack)).To(Succeed())
			}
		})

		It("should wait for infrastructure stack", func() {
			By("wait for infrastructure stack")
			test := struct {
				returnCreateCustomStackRun *gqlclient.CustomStackRunFragment
				expectedStatus             v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
						{
							Type:   v1alpha1.ReadyConditionType.String(),
							Status: metav1.ConditionFalse,
							Reason: v1alpha1.ReadyConditionReason.String(),
						},
						{
							Type:    v1alpha1.SynchronizedConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.SynchronizedConditionReasonError.String(),
							Message: "stack is not ready",
						},
					},
				},
				returnCreateCustomStackRun: &gqlclient.CustomStackRunFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("CreateCustomStackRun", mock.Anything, mock.Anything).Return(test.returnCreateCustomStackRun, nil)
			reconciler := &controller.CustomStackRunReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			resource := &v1alpha1.CustomStackRun{}
			err = k8sClient.Get(ctx, typeNamespacedName, resource)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(resource.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile the resource CustomStackRun", func() {
			By("Create Custom Stack Run")
			test := struct {
				returnCreateCustomStackRun *gqlclient.CustomStackRunFragment
				expectedStatus             v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
					SHA: lo.ToPtr("G3UMYOT66ETGYFUYV3S54WCWITWZN5MIBHD73OCGQDAH4ZHI46YQ===="),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
						{
							Type:   v1alpha1.ReadyConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.ReadyConditionReason.String(),
						},
						{
							Type:   v1alpha1.SynchronizedConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.SynchronizedConditionReason.String(),
						},
					},
				},
				returnCreateCustomStackRun: &gqlclient.CustomStackRunFragment{
					ID: id,
				},
			}

			Expect(common.MaybePatch(k8sClient, &v1alpha1.InfrastructureStack{
				ObjectMeta: metav1.ObjectMeta{Name: stackName, Namespace: namespace},
			}, func(c *v1alpha1.InfrastructureStack) {
				c.Status.ID = lo.ToPtr(id)
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("CreateCustomStackRun", mock.Anything, mock.Anything).Return(test.returnCreateCustomStackRun, nil)
			reconciler := &controller.CustomStackRunReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			resource := &v1alpha1.CustomStackRun{}
			err = k8sClient.Get(ctx, typeNamespacedName, resource)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(resource.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile and update previously created custom stack run", func() {
			test := struct {
				returnUpdateCustomStack *gqlclient.CustomStackRunFragment
				expectedStatus          v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
					SHA: lo.ToPtr("OIO264HOFLVR3M7A5I4DIS6V3JX4TSTXE7JWRVG6FH3S4BCZ5DLA===="),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.NamespacedCredentialsConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.NamespacedCredentialsReasonDefault.String(),
							Message: v1alpha1.NamespacedCredentialsConditionMessage.String(),
						},
						{
							Type:   v1alpha1.ReadyConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.ReadyConditionReason.String(),
						},
						{
							Type:   v1alpha1.SynchronizedConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.SynchronizedConditionReason.String(),
						},
					},
				},
				returnUpdateCustomStack: &gqlclient.CustomStackRunFragment{
					ID: id,
				},
			}

			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.CustomStackRun{
				ObjectMeta: metav1.ObjectMeta{Name: stackName, Namespace: namespace},
			}, func(stack *v1alpha1.CustomStackRun) {
				stack.Spec.Commands = []v1alpha1.CommandAttributes{
					{
						Cmd:  "echo",
						Args: []string{"hello"},
						Dir:  lo.ToPtr("test"),
					},
				}
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetCustomStackRun", mock.Anything, mock.Anything).Return(nil, nil)
			fakeConsoleClient.On("UpdateCustomStackRun", mock.Anything, mock.Anything, mock.Anything).Return(test.returnUpdateCustomStack, nil)

			reconciler := &controller.CustomStackRunReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			resource := &v1alpha1.CustomStackRun{}
			err = k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(resource.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))

		})

		It("should successfully delete the custom stack run", func() {
			By("Delete resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.CustomStackRun{
				ObjectMeta: metav1.ObjectMeta{Name: stackName, Namespace: namespace},
			}, func(p *v1alpha1.CustomStackRun) {
				p.Status.ID = lo.ToPtr(id)
			})).To(Succeed())
			resource := &v1alpha1.CustomStackRun{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetCustomStackRun", mock.Anything, mock.Anything).Return(nil, nil)
			fakeConsoleClient.On("DeleteCustomStackRun", mock.Anything, mock.Anything).Return(nil)
			reconciler := &controller.CustomStackRunReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err = reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			custom := &v1alpha1.CustomStackRun{}
			err = k8sClient.Get(ctx, typeNamespacedName, custom)
			Expect(err).To(HaveOccurred())
		})

	})

})
