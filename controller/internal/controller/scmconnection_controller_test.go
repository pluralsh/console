package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	gqlclient "github.com/pluralsh/console-client-go"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/controller"
	common "github.com/pluralsh/console/controller/internal/test/common"
	"github.com/pluralsh/console/controller/internal/test/mocks"
)

var _ = Describe("SCM Connection Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			scmName   = "scm-connection-test"
			scmType   = gqlclient.ScmTypeGithub
			namespace = "default"
			sha       = "SJQ6GH4SZX7YCR7PM726XIBLSLH5TP6Q33HX4OMUARQGCULTOXTA===="
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      scmName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind ScmConnection")
			scm := &v1alpha1.ScmConnection{}
			if err := k8sClient.Get(ctx, typeNamespacedName, scm); err == nil {
				Expect(k8sClient.Delete(ctx, scm)).To(Succeed())
			}
			resource := &v1alpha1.ScmConnection{
				ObjectMeta: metav1.ObjectMeta{
					Name:      scmName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ScmConnectionSpec{
					Name: scmName,
					Type: scmType,
				},
			}
			Expect(k8sClient.Create(ctx, resource)).To(Succeed())
		})

		AfterAll(func() {
			scm := &v1alpha1.ScmConnection{}
			if err := k8sClient.Get(ctx, types.NamespacedName{Name: scmName, Namespace: namespace}, scm); err == nil {
				By("Cleanup the specific resource instance ScmConnection")
				Expect(k8sClient.Delete(ctx, scm)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				returnGetScmConnection *gqlclient.ScmConnectionFragment
				expectedStatus         v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr(sha),
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.ReadonlyConditionType.String(),
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
				returnGetScmConnection: &gqlclient.ScmConnectionFragment{
					ID: "123",
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetScmConnectionByName", mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, scmName)).Once()
			fakeConsoleClient.On("IsScmConnectionExists", mock.Anything, mock.Anything).Return(false, nil).Once()
			fakeConsoleClient.On("CreateScmConnection", mock.Anything, mock.Anything).Return(test.returnGetScmConnection, nil)
			scmReconciler := &controller.ScmConnectionReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := scmReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			scm := &v1alpha1.ScmConnection{}
			err = k8sClient.Get(ctx, typeNamespacedName, scm)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(scm.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		//	It("should successfully reconcile the resource", func() {
		//		By("Update resource")
		//		test := struct {
		//			returnGetService *gqlclient.ServiceDeploymentExtended
		//			expectedStatus   v1alpha1.ServiceStatus
		//		}{
		//			expectedStatus: v1alpha1.ServiceStatus{
		//				Status: v1alpha1.Status{
		//					ID:  lo.ToPtr("123"),
		//					SHA: lo.ToPtr(sha),
		//					Conditions: []metav1.Condition{
		//						{
		//							Type:    v1alpha1.ReadyConditionType.String(),
		//							Status:  metav1.ConditionFalse,
		//							Reason:  v1alpha1.ReadyConditionReason.String(),
		//							Message: "The service components are not ready yet",
		//						},
		//						{
		//							Type:   v1alpha1.SynchronizedConditionType.String(),
		//							Status: metav1.ConditionTrue,
		//							Reason: v1alpha1.SynchronizedConditionReason.String(),
		//						},
		//					},
		//				},
		//			},
		//			returnGetService: &gqlclient.ServiceDeploymentExtended{
		//				ID: "123",
		//			},
		//		}
		//
		//		Expect(common.MaybePatch(k8sClient, &v1alpha1.ServiceDeployment{
		//			ObjectMeta: metav1.ObjectMeta{Name: scmName, Namespace: namespace},
		//		}, func(p *v1alpha1.ServiceDeployment) {
		//			p.Status.ID = lo.ToPtr(id)
		//			p.Status.SHA = lo.ToPtr("ABC")
		//		})).To(Succeed())
		//
		//		fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
		//		fakeConsoleClient.On("GetService", mock.Anything, mock.Anything).Return(test.returnGetService, nil)
		//		fakeConsoleClient.On("UpdateService", mock.Anything, mock.Anything).Return(nil)
		//		serviceReconciler := &controller.ServiceReconciler{
		//			Client:        k8sClient,
		//			Scheme:        k8sClient.Scheme(),
		//			ConsoleClient: fakeConsoleClient,
		//		}
		//
		//		_, err := serviceReconciler.Reconcile(ctx, reconcile.Request{
		//			NamespacedName: typeNamespacedName,
		//		})
		//
		//		Expect(err).NotTo(HaveOccurred())
		//
		//		service := &v1alpha1.ServiceDeployment{}
		//		err = k8sClient.Get(ctx, typeNamespacedName, service)
		//
		//		Expect(err).NotTo(HaveOccurred())
		//		Expect(sanitizeServiceConditions(service.Status)).To(Equal(sanitizeServiceConditions(test.expectedStatus)))
		//	})
		//
		//	It("should successfully reconcile the resource", func() {
		//		By("Update resource with the dependencies")
		//		test := struct {
		//			returnGetService *gqlclient.ServiceDeploymentExtended
		//			expectedStatus   v1alpha1.ServiceStatus
		//		}{
		//			expectedStatus: v1alpha1.ServiceStatus{
		//				Status: v1alpha1.Status{
		//					ID:  lo.ToPtr(id),
		//					SHA: lo.ToPtr("HNVNOPAXHYMV5XQMPCT3ILWU4LQKJFEFF5EF5SDVNZRDLSP7E6DQ===="),
		//					Conditions: []metav1.Condition{
		//						{
		//							Type:    v1alpha1.ReadyConditionType.String(),
		//							Status:  metav1.ConditionFalse,
		//							Reason:  v1alpha1.ReadyConditionReason.String(),
		//							Message: "The service components are not ready yet",
		//						},
		//						{
		//							Type:   v1alpha1.SynchronizedConditionType.String(),
		//							Status: metav1.ConditionTrue,
		//							Reason: v1alpha1.SynchronizedConditionReason.String(),
		//						},
		//					},
		//				},
		//			},
		//			returnGetService: &gqlclient.ServiceDeploymentExtended{
		//				ID: "123",
		//			},
		//		}
		//		dep1 := "dep-1"
		//		dep2 := "dep-2"
		//		createService(ctx, namespace, dep1, clusterName, repoName)
		//		createService(ctx, namespace, dep2, clusterName, repoName)
		//		Expect(common.MaybePatch(k8sClient, &v1alpha1.ServiceDeployment{
		//			ObjectMeta: metav1.ObjectMeta{Name: scmName, Namespace: namespace},
		//		}, func(p *v1alpha1.ServiceDeployment) {
		//			p.Status.ID = lo.ToPtr(id)
		//			p.Status.SHA = lo.ToPtr(sha)
		//		})).To(Succeed())
		//		Expect(common.MaybePatchObject(k8sClient, &v1alpha1.ServiceDeployment{
		//			ObjectMeta: metav1.ObjectMeta{Name: scmName, Namespace: namespace},
		//		}, func(p *v1alpha1.ServiceDeployment) {
		//			p.Spec.Dependencies = []v1alpha1.ServiceDependency{
		//				{
		//					Name: dep1,
		//				},
		//				{
		//					Name: dep2,
		//				},
		//			}
		//		})).To(Succeed())
		//
		//		fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
		//		fakeConsoleClient.On("GetService", mock.Anything, mock.Anything).Return(test.returnGetService, nil)
		//		fakeConsoleClient.On("UpdateService", mock.Anything, mock.Anything).Return(nil)
		//		serviceReconciler := &controller.ServiceReconciler{
		//			Client:        k8sClient,
		//			Scheme:        k8sClient.Scheme(),
		//			ConsoleClient: fakeConsoleClient,
		//		}
		//
		//		_, err := serviceReconciler.Reconcile(ctx, reconcile.Request{
		//			NamespacedName: typeNamespacedName,
		//		})
		//
		//		Expect(err).NotTo(HaveOccurred())
		//
		//		service := &v1alpha1.ServiceDeployment{}
		//		err = k8sClient.Get(ctx, typeNamespacedName, service)
		//
		//		Expect(err).NotTo(HaveOccurred())
		//		Expect(sanitizeServiceConditions(service.Status)).To(Equal(sanitizeServiceConditions(test.expectedStatus)))
		//	})
		//
		//	It("should successfully reconcile the resource", func() {
		//		By("Delete resource")
		//		resource := &v1alpha1.ServiceDeployment{}
		//		err := k8sClient.Get(ctx, typeNamespacedName, resource)
		//		Expect(err).NotTo(HaveOccurred())
		//		err = k8sClient.Delete(ctx, resource)
		//		Expect(err).NotTo(HaveOccurred())
		//
		//		fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
		//		fakeConsoleClient.On("GetService", mock.Anything, mock.Anything).Return(nil, nil).Once()
		//		serviceReconciler := &controller.ServiceReconciler{
		//			Client:        k8sClient,
		//			Scheme:        k8sClient.Scheme(),
		//			ConsoleClient: fakeConsoleClient,
		//		}
		//
		//		_, err = serviceReconciler.Reconcile(ctx, reconcile.Request{
		//			NamespacedName: typeNamespacedName,
		//		})
		//
		//		Expect(err).NotTo(HaveOccurred())
		//
		//		service := &v1alpha1.ServiceDeployment{}
		//		err = k8sClient.Get(ctx, typeNamespacedName, service)
		//		Expect(err).To(HaveOccurred())
		//
		//	})
	})
})

//func createService(ctx context.Context, namespace, name, clusterName, repoName string) {
//	serviceDep1 := &v1alpha1.ServiceDeployment{}
//	if err := k8sClient.Get(ctx, types.NamespacedName{Name: name, Namespace: namespace}, serviceDep1); err == nil {
//		Expect(k8sClient.Delete(ctx, serviceDep1)).To(Succeed())
//	}
//	resource := &v1alpha1.ServiceDeployment{
//		ObjectMeta: metav1.ObjectMeta{
//			Name:      name,
//			Namespace: namespace,
//		},
//		Spec: v1alpha1.ServiceSpec{
//			Version:       lo.ToPtr("1.24"),
//			ClusterRef:    corev1.ObjectReference{Name: clusterName, Namespace: namespace},
//			RepositoryRef: &corev1.ObjectReference{Name: repoName, Namespace: namespace},
//			SyncConfig: &v1alpha1.SyncConfigAttributes{
//				CreateNamespace: lo.ToPtr(true),
//				Labels:          map[string]string{"a": "a"},
//				Annotations:     map[string]string{"b": "b"},
//			},
//		},
//	}
//	Expect(k8sClient.Create(ctx, resource)).To(Succeed())
//}
