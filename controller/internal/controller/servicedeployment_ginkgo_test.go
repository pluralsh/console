package controller

import (
	"context"
	"github.com/pluralsh/console/controller/internal/test/utils"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	gqlclient "github.com/pluralsh/console-client-go"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/test/mocks"
)

func sanitizeServiceConditions(status v1alpha1.ServiceStatus) v1alpha1.ServiceStatus {
	for i := range status.Conditions {
		status.Conditions[i].LastTransitionTime = metav1.Time{}
		status.Conditions[i].ObservedGeneration = 0
	}

	return status
}

var _ = Describe("Service Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			serviceName = "service-test"
			clusterName = "cluster-test"
			repoName    = "repo-test"
			namespace   = "default"
			id          = "123"
			repoUrl     = "https://test"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      serviceName,
			Namespace: namespace,
		}

		service := &v1alpha1.ServiceDeployment{}
		BeforeAll(func() {
			By("creating the custom resource for the Kind ServiceDeployment")
			err := k8sClient.Get(ctx, typeNamespacedName, service)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.ServiceDeployment{
					ObjectMeta: metav1.ObjectMeta{
						Name:      serviceName,
						Namespace: namespace,
					},
					Spec: v1alpha1.ServiceSpec{
						Version:       "1.24",
						ClusterRef:    corev1.ObjectReference{Name: clusterName, Namespace: namespace},
						RepositoryRef: corev1.ObjectReference{Name: repoName, Namespace: namespace},
					},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}
			By("creating the custom resource for the Kind Cluster")
			Expect(utils.MaybeCreate(k8sClient, &v1alpha1.Cluster{
				ObjectMeta: metav1.ObjectMeta{Name: clusterName, Namespace: namespace},
				Spec: v1alpha1.ClusterSpec{
					Cloud: "aws",
				},
			}, func(p *v1alpha1.Cluster) {
				p.Status.ID = lo.ToPtr(id)
			})).To(Succeed())
			By("creating the custom resource for the Kind Repository")
			Expect(utils.MaybeCreate(k8sClient, &v1alpha1.GitRepository{
				ObjectMeta: metav1.ObjectMeta{Name: repoName, Namespace: namespace},
				Spec: v1alpha1.GitRepositorySpec{
					Url: repoUrl,
				},
			}, func(p *v1alpha1.GitRepository) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.Health = v1alpha1.GitHealthPullable
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
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				returnGetService *gqlclient.ServiceDeploymentExtended
				expectedStatus   v1alpha1.ServiceStatus
			}{
				expectedStatus: v1alpha1.ServiceStatus{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("E2KK4GJDZD4C62CW2OXWRDOWPOQ6XQJ4XHGZYFTANUMGIN7SGTPQ===="),
					Conditions: []metav1.Condition{
						{
							Type:   v1alpha1.ReadyConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.ReadyConditionReason.String(),
						},
					},
				},
				returnGetService: &gqlclient.ServiceDeploymentExtended{
					ID: "123",
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetService", mock.Anything, mock.Anything).Return(nil, nil).Once()
			fakeConsoleClient.On("CreateService", mock.Anything, mock.Anything).Return(nil, nil)
			fakeConsoleClient.On("GetService", mock.Anything, mock.Anything).Return(test.returnGetService, nil)
			serviceReconciler := &ServiceReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := serviceReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			service := &v1alpha1.ServiceDeployment{}
			err = k8sClient.Get(ctx, typeNamespacedName, service)

			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeServiceConditions(service.Status)).To(Equal(sanitizeServiceConditions(test.expectedStatus)))
		})
		It("should successfully reconcile the resource", func() {
			By("Update resource")
			test := struct {
				returnGetService *gqlclient.ServiceDeploymentExtended
				expectedStatus   v1alpha1.ServiceStatus
			}{
				expectedStatus: v1alpha1.ServiceStatus{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("E2KK4GJDZD4C62CW2OXWRDOWPOQ6XQJ4XHGZYFTANUMGIN7SGTPQ===="),
					Conditions: []metav1.Condition{
						{
							Type:   v1alpha1.ReadyConditionType.String(),
							Status: metav1.ConditionTrue,
							Reason: v1alpha1.ReadyConditionReason.String(),
						},
					},
				},
				returnGetService: &gqlclient.ServiceDeploymentExtended{
					ID: "123",
				},
			}

			Expect(utils.MaybePatch(k8sClient, &v1alpha1.ServiceDeployment{
				ObjectMeta: metav1.ObjectMeta{Name: serviceName, Namespace: namespace},
			}, func(p *v1alpha1.ServiceDeployment) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("ABC")
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetService", mock.Anything, mock.Anything).Return(test.returnGetService, nil)
			fakeConsoleClient.On("UpdateService", mock.Anything, mock.Anything).Return(nil)
			serviceReconciler := &ServiceReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := serviceReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			service := &v1alpha1.ServiceDeployment{}
			err = k8sClient.Get(ctx, typeNamespacedName, service)

			Expect(err).NotTo(HaveOccurred())
			Expect(sanitizeServiceConditions(service.Status)).To(Equal(sanitizeServiceConditions(test.expectedStatus)))
		})
		It("should successfully reconcile the resource", func() {
			By("Delete resource")
			resource := &v1alpha1.ServiceDeployment{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetService", mock.Anything, mock.Anything).Return(nil, nil).Once()
			serviceReconciler := &ServiceReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = serviceReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			service := &v1alpha1.ServiceDeployment{}
			err = k8sClient.Get(ctx, typeNamespacedName, service)
			Expect(err).To(HaveOccurred())

		})
	})

})
