package controller_test

import (
	"context"
	"sort"

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
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

func sanitizeServiceConditions(status v1alpha1.ServiceStatus) v1alpha1.ServiceStatus {
	for i := range status.Conditions {
		status.Conditions[i].LastTransitionTime = metav1.Time{}
		status.Conditions[i].ObservedGeneration = 0
	}

	sort.Slice(status.Conditions, func(i, j int) bool {
		return status.Conditions[i].Type < status.Conditions[j].Type
	})

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
			sha         = "3J6U6HYLPSVVQDIMOHFVRQVA624SIRDAYIKOEPGJQYOVUSPIX5NA===="
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      serviceName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind ServiceDeployment")
			service := &v1alpha1.ServiceDeployment{}
			if err := k8sClient.Get(ctx, typeNamespacedName, service); err == nil {
				Expect(k8sClient.Delete(ctx, service)).To(Succeed())
			}
			resource := &v1alpha1.ServiceDeployment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      serviceName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ServiceSpec{
					Version:       lo.ToPtr("1.24"),
					ClusterRef:    corev1.ObjectReference{Name: clusterName, Namespace: namespace},
					RepositoryRef: &corev1.ObjectReference{Name: repoName, Namespace: namespace},
					SyncConfig: &v1alpha1.SyncConfigAttributes{
						CreateNamespace: lo.ToPtr(true),
						Labels:          map[string]string{"a": "a"},
						Annotations:     map[string]string{"b": "b"},
					},
				},
			}
			Expect(k8sClient.Create(ctx, resource)).To(Succeed())

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
			service := &v1alpha1.ServiceDeployment{}
			if err := k8sClient.Get(ctx, types.NamespacedName{Name: serviceName, Namespace: namespace}, service); err == nil {
				By("Cleanup the specific resource instance ServiceDeployment")
				Expect(k8sClient.Delete(ctx, service)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				returnGetService *gqlclient.ServiceDeploymentExtended
				expectedStatus   v1alpha1.ServiceStatus
			}{
				expectedStatus: v1alpha1.ServiceStatus{
					Status: v1alpha1.Status{
						ID:  lo.ToPtr("123"),
						SHA: lo.ToPtr(sha),
						Conditions: []metav1.Condition{
							{
								Type:    v1alpha1.ReadyConditionType.String(),
								Status:  metav1.ConditionFalse,
								Reason:  v1alpha1.ReadyConditionReason.String(),
								Message: "The service components are not ready yet",
							},
							{
								Type:   v1alpha1.SynchronizedConditionType.String(),
								Status: metav1.ConditionTrue,
								Reason: v1alpha1.SynchronizedConditionReason.String(),
							},
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
			serviceReconciler := &controller.ServiceReconciler{
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
					Status: v1alpha1.Status{
						ID:  lo.ToPtr("123"),
						SHA: lo.ToPtr(sha),
						Conditions: []metav1.Condition{
							{
								Type:    v1alpha1.ReadyConditionType.String(),
								Status:  metav1.ConditionFalse,
								Reason:  v1alpha1.ReadyConditionReason.String(),
								Message: "The service components are not ready yet",
							},
							{
								Type:   v1alpha1.SynchronizedConditionType.String(),
								Status: metav1.ConditionTrue,
								Reason: v1alpha1.SynchronizedConditionReason.String(),
							},
						},
					},
				},
				returnGetService: &gqlclient.ServiceDeploymentExtended{
					ID: "123",
				},
			}

			Expect(common.MaybePatch(k8sClient, &v1alpha1.ServiceDeployment{
				ObjectMeta: metav1.ObjectMeta{Name: serviceName, Namespace: namespace},
			}, func(p *v1alpha1.ServiceDeployment) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("ABC")
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetService", mock.Anything, mock.Anything).Return(test.returnGetService, nil)
			fakeConsoleClient.On("UpdateService", mock.Anything, mock.Anything).Return(nil)
			serviceReconciler := &controller.ServiceReconciler{
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
			serviceReconciler := &controller.ServiceReconciler{
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

var _ = Describe("Merge Helm Values", Ordered, func() {
	Context("When creating attributes", func() {
		ctx := context.Background()
		const (
			secretName    = "test"
			namespace     = "default"
			secretContent = `console:
  dashboard:
    enabled: true
  postgres:
    parameters:
      max_connections: 202`
		)

		BeforeAll(func() {
			By("creating the secret")
			secret := &corev1.Secret{}
			typeNamespacedName := types.NamespacedName{
				Name:      secretName,
				Namespace: namespace,
			}
			err := k8sClient.Get(ctx, typeNamespacedName, secret)
			if err != nil && errors.IsNotFound(err) {
				resource := &corev1.Secret{
					ObjectMeta: metav1.ObjectMeta{
						Name:      secretName,
						Namespace: namespace,
					},
					Data: map[string][]byte{
						"values.yaml": []byte(secretContent),
					},
				}
				Expect(k8sClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterAll(func() {
			resource := &corev1.Secret{}
			err := k8sClient.Get(ctx, types.NamespacedName{Name: secretName, Namespace: namespace}, resource)
			Expect(err).NotTo(HaveOccurred())
			By("Cleanup the specific resource instance Cluster")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())
		})

		It("should successfully merge the maps", func() {
			test := struct {
				SecretRef *corev1.SecretReference
				Values    *runtime.RawExtension
			}{
				SecretRef: &corev1.SecretReference{
					Name:      secretName,
					Namespace: namespace,
				},
				Values: &runtime.RawExtension{
					Raw: []byte(`console:
  dashboard:
    enabled: false
  postgres:
    parameters:
      max_connections: 101`),
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			serviceReconciler := &controller.ServiceReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			out, err := serviceReconciler.MergeHelmValues(ctx, test.SecretRef, test.Values)
			Expect(err).NotTo(HaveOccurred())
			Expect(*out).To(Equal(`console:
  dashboard:
    enabled: true
  postgres:
    parameters:
      max_connections: 202
`))

		})

		It("should successfully return values", func() {
			test := struct {
				SecretRef *corev1.SecretReference
				Values    *runtime.RawExtension
			}{
				Values: &runtime.RawExtension{
					Raw: []byte(`console:
  dashboard:
    enabled: false
  postgres:
    parameters:
      max_connections: 101`),
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			serviceReconciler := &controller.ServiceReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			out, err := serviceReconciler.MergeHelmValues(ctx, test.SecretRef, test.Values)
			Expect(err).NotTo(HaveOccurred())
			Expect(*out).To(Equal(`console:
  dashboard:
    enabled: false
  postgres:
    parameters:
      max_connections: 101
`))

		})

		It("should successfully return fromValues", func() {
			test := struct {
				SecretRef *corev1.SecretReference
				Values    *runtime.RawExtension
			}{
				SecretRef: &corev1.SecretReference{
					Name:      secretName,
					Namespace: namespace,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			serviceReconciler := &controller.ServiceReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			out, err := serviceReconciler.MergeHelmValues(ctx, test.SecretRef, test.Values)
			Expect(err).NotTo(HaveOccurred())
			Expect(*out).To(Equal(`console:
  dashboard:
    enabled: true
  postgres:
    parameters:
      max_connections: 202
`))
		})
	})
})
