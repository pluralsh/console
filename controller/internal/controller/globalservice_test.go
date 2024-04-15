package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	gqlclient "github.com/pluralsh/console-client-go"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/controller"
	common "github.com/pluralsh/console/controller/internal/test/common"
	"github.com/pluralsh/console/controller/internal/test/mocks"
)

var _ = Describe("Global Service Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			serviceName  = "service-test"
			clusterName  = "cluster-test"
			repoName     = "repo-test"
			namespace    = "default"
			id           = "123"
			repoUrl      = "https://test"
			providerName = "test"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      serviceName,
			Namespace: namespace,
		}

		service := &v1alpha1.ServiceDeployment{}
		BeforeAll(func() {
			By("creating the custom resource for the Kind GlobalService")
			err := k8sClient.Get(ctx, typeNamespacedName, service)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.ServiceDeployment{
					ObjectMeta: metav1.ObjectMeta{
						Name:      serviceName,
						Namespace: namespace,
					},
					Spec: v1alpha1.ServiceSpec{
						Version:       lo.ToPtr("1.24"),
						ClusterRef:    corev1.ObjectReference{Name: clusterName, Namespace: namespace},
						RepositoryRef: &corev1.ObjectReference{Name: repoName, Namespace: namespace},
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, func(p *v1alpha1.ServiceDeployment) {
					p.Status.ID = lo.ToPtr(id)
				})).To(Succeed())

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

			By("creating the custom resource for the Kind Provider")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.Provider{
				ObjectMeta: metav1.ObjectMeta{Name: providerName, Namespace: namespace},
				Spec: v1alpha1.ProviderSpec{
					Cloud:     "aws",
					Name:      providerName,
					Namespace: namespace,
				},
			}, func(p *v1alpha1.Provider) {
				p.Status.ID = lo.ToPtr(id)
			})).To(Succeed())

			By("creating the custom resource for the Kind GlobalService")
			Expect(common.MaybeCreate(k8sClient, &v1alpha1.GlobalService{
				ObjectMeta: metav1.ObjectMeta{Name: serviceName, Namespace: namespace},
				Spec: v1alpha1.GlobalServiceSpec{
					Distro: lo.ToPtr(gqlclient.ClusterDistroGeneric),
					ServiceRef: &corev1.ObjectReference{
						Name:      serviceName,
						Namespace: namespace,
					},
					ProviderRef: &corev1.ObjectReference{
						Name:      providerName,
						Namespace: namespace,
					},
					Template: &v1alpha1.ServiceTemplate{
						SyncConfig: &v1alpha1.SyncConfigAttributes{
							CreateNamespace: lo.ToPtr(false),
							Labels:          map[string]string{"a": "a"},
							Annotations:     map[string]string{"b": "b"},
						},
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
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				returnCreateService *gqlclient.GlobalServiceFragment
				expectedStatus      v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("UGRGWOH2SGNMBJCLILLWETDKRMFIDDZ4NAVFMY7MW76QTW7QDTYQ===="),
					Conditions: []metav1.Condition{
						{
							Type:   v1alpha1.SynchronizedConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.SynchronizedConditionReason.String(),
						},
					},
				},
				returnCreateService: &gqlclient.GlobalServiceFragment{
					ID: "123",
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("CreateGlobalService", mock.Anything, mock.Anything).Return(test.returnCreateService, nil)
			serviceReconciler := &controller.GlobalServiceReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := serviceReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			service := &v1alpha1.GlobalService{}
			err = k8sClient.Get(ctx, typeNamespacedName, service)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(service.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})
		It("should successfully reconcile the resource", func() {
			By("Delete resource")
			test := struct {
				returnCreateService *gqlclient.GlobalServiceFragment
			}{
				returnCreateService: &gqlclient.GlobalServiceFragment{
					ID: "123",
				},
			}

			Expect(common.MaybePatch(k8sClient, &v1alpha1.GlobalService{
				ObjectMeta: metav1.ObjectMeta{Name: serviceName, Namespace: namespace},
			}, func(p *v1alpha1.GlobalService) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.GlobalService{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetGlobalService", mock.Anything, mock.Anything).Return(test.returnCreateService, nil)
			fakeConsoleClient.On("DeleteGlobalService", mock.Anything, mock.Anything).Return(nil)
			serviceReconciler := &controller.GlobalServiceReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = serviceReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			service := &v1alpha1.GlobalService{}
			err = k8sClient.Get(ctx, typeNamespacedName, service)

			Expect(err.Error()).To(Equal("globalservices.deployments.plural.sh \"service-test\" not found"))
		})
	})

})
