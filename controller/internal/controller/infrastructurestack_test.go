package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	gqlclient "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/controller"
	common "github.com/pluralsh/console/controller/internal/test/common"
	"github.com/pluralsh/console/controller/internal/test/mocks"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

var _ = Describe("Infrastructure Stack Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			stackName   = "stack-test"
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
					Configuration: v1alpha1.StackConfiguration{
						Version: "v0.0.1",
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
		})

		It("should successfully reconcile the resource InfrastructureStack", func() {
			By("Create Stack")
			test := struct {
				returnCreateStack *gqlclient.InfrastructureStackFragment
				expectedStatus    v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
					SHA: lo.ToPtr("32YZZXF6HMFYYT4XLB647U2ROKV75U54EMPOUSDBI55ZWYK2Y2QQ===="),
					Conditions: []metav1.Condition{
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
				returnCreateStack: &gqlclient.InfrastructureStackFragment{
					ID: lo.ToPtr(id),
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("CreateStack", mock.Anything, mock.Anything).Return(test.returnCreateStack, nil)
			reconciler := &controller.InfrastructureStackReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			resource := &v1alpha1.InfrastructureStack{}
			err = k8sClient.Get(ctx, typeNamespacedName, resource)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(resource.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile and update previously created stack", func() {
			test := struct {
				returnCreateStack *gqlclient.InfrastructureStackFragment
				expectedStatus    v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
					SHA: lo.ToPtr("SSJWBR7QSBV72ZZCUX7FESBBFSC5BCZYW6EWZY5RMTTHNR5Q2MCQ===="),
					Conditions: []metav1.Condition{
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
				returnCreateStack: &gqlclient.InfrastructureStackFragment{
					ID: lo.ToPtr(id),
				},
			}

			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.InfrastructureStack{
				ObjectMeta: metav1.ObjectMeta{Name: stackName, Namespace: namespace},
			}, func(stack *v1alpha1.InfrastructureStack) {
				stack.Spec.JobSpec = &v1alpha1.JobSpec{
					Containers: []*v1alpha1.Container{
						{
							Image: "test",
							Args:  lo.ToSlicePtr([]string{"a", "b", "c"}),
							EnvFrom: []*v1alpha1.EnvFrom{
								{
									ConfigMap: "a",
								},
								{
									Secret: "b",
								},
							},
							Env: []*v1alpha1.Env{
								{
									Name:  "a",
									Value: "b",
								},
								{
									Name:  "c",
									Value: "d",
								},
							},
						},
					},
					ServiceAccount: lo.ToPtr("test2"),
				}
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetStack", mock.Anything, mock.Anything).Return(nil, nil)
			fakeConsoleClient.On("UpdateStack", mock.Anything, mock.Anything, mock.Anything).Return(nil, nil)

			reconciler := &controller.InfrastructureStackReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			resource := &v1alpha1.InfrastructureStack{}
			err = k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(resource.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))

		})

		It("should successfully reconcile the resource", func() {
			By("Delete resource")
			test := struct {
				returnResource *gqlclient.InfrastructureStackFragment
			}{
				returnResource: &gqlclient.InfrastructureStackFragment{
					ID: lo.ToPtr(id),
				},
			}

			Expect(common.MaybePatch(k8sClient, &v1alpha1.InfrastructureStack{
				ObjectMeta: metav1.ObjectMeta{Name: stackName, Namespace: namespace},
			}, func(p *v1alpha1.InfrastructureStack) {
				p.Status.ID = lo.ToPtr(id)
			})).To(Succeed())
			resource := &v1alpha1.InfrastructureStack{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetStack", mock.Anything, mock.Anything).Return(test.returnResource, nil)
			fakeConsoleClient.On("DeleteStack", mock.Anything, mock.Anything).Return(nil)
			reconciler := &controller.InfrastructureStackReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			service := &v1alpha1.InfrastructureStack{}
			err = k8sClient.Get(ctx, typeNamespacedName, service)
			Expect(err).NotTo(HaveOccurred())
		})

	})

})
