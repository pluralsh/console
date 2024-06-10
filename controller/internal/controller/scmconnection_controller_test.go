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
			scmName         = "scm-connection-test"
			scmType         = gqlclient.ScmTypeGithub
			namespace       = "default"
			id              = "123"
			sha             = "SJQ6GH4SZX7YCR7PM726XIBLSLH5TP6Q33HX4OMUARQGCULTOXTA===="
			readonlyScmName = "readonly-scm-connection"
			readonlyScmID   = "readonly"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      scmName,
			Namespace: namespace,
		}

		readonlyTypeNamespacedName := types.NamespacedName{
			Namespace: namespace,
			Name:      readonlyScmName,
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

			By("creating readonly custom resource for the Kind ScmConnection")
			scm = &v1alpha1.ScmConnection{}
			if err := k8sClient.Get(ctx, readonlyTypeNamespacedName, scm); err == nil {
				Expect(k8sClient.Delete(ctx, scm)).To(Succeed())
			}
			resource = &v1alpha1.ScmConnection{
				ObjectMeta: metav1.ObjectMeta{
					Name:      readonlyScmName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ScmConnectionSpec{
					Name: readonlyScmName,
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

		It("should successfully reconcile the resource on create", func() {
			By("Create resource")
			test := struct {
				returnGetScmConnection *gqlclient.ScmConnectionFragment
				expectedStatus         v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
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
					ID: id,
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

		It("should successfully reconcile the resource on update", func() {
			By("Update resource")
			test := struct {
				returnGetScmConnection *gqlclient.ScmConnectionFragment
				expectedStatus         v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr(id),
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
					ID: id,
				},
			}

			Expect(common.MaybePatch(k8sClient, &v1alpha1.ScmConnection{
				ObjectMeta: metav1.ObjectMeta{Name: scmName, Namespace: namespace},
			}, func(p *v1alpha1.ScmConnection) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("ABC")
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetScmConnectionByName", mock.Anything, mock.Anything).Return(test.returnGetScmConnection, nil)
			fakeConsoleClient.On("IsScmConnectionExists", mock.Anything, mock.Anything).Return(true, nil).Once()
			fakeConsoleClient.On("UpdateScmConnection", mock.Anything, mock.Anything, mock.Anything).Return(test.returnGetScmConnection, nil)
			serviceReconciler := &controller.ScmConnectionReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := serviceReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			scm := &v1alpha1.ScmConnection{}
			err = k8sClient.Get(ctx, typeNamespacedName, scm)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(scm.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile the resource", func() {
			By("Delete resource")
			resource := &v1alpha1.ScmConnection{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetScmConnectionByName", mock.Anything, mock.Anything).Return(nil, nil).Once()
			fakeConsoleClient.On("IsScmConnectionExists", mock.Anything, mock.Anything).Return(true, nil).Once()
			fakeConsoleClient.On("DeleteScmConnection", mock.Anything, mock.Anything).Return(nil).Once()
			fakeConsoleClient.On("IsScmConnectionExists", mock.Anything, mock.Anything).Return(false, nil).Once()
			scmReconciler := &controller.ScmConnectionReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			// Reconcile once to initiate ScmConnection deletion from the API
			_, err = scmReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			// Second reconcile sees that the object no longer exists in the API and removes the finalizer.
			_, err = scmReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			scm := &v1alpha1.ScmConnection{}
			err = k8sClient.Get(ctx, typeNamespacedName, scm)
			Expect(err).To(HaveOccurred())
		})

		It("should successfully reconcile readonly resource", func() {
			test := struct {
				returnGetScmConnection *gqlclient.ScmConnectionFragment
				expectedStatus         v1alpha1.Status
			}{
				&gqlclient.ScmConnectionFragment{
					ID:   readonlyScmID,
					Name: readonlyScmName,
				},
				v1alpha1.Status{
					ID:  lo.ToPtr(readonlyScmID),
					SHA: nil,
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionTrue,
							Reason:  v1alpha1.ReadonlyConditionType.String(),
							Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
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
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetScmConnectionByName", mock.Anything, mock.Anything).Return(test.returnGetScmConnection, nil)
			fakeConsoleClient.On("IsScmConnectionExists", mock.Anything, mock.Anything).Return(true, nil)

			scmReconciler := &controller.ScmConnectionReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := scmReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: readonlyTypeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			scm := &v1alpha1.ScmConnection{}
			err = k8sClient.Get(ctx, readonlyTypeNamespacedName, scm)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(scm.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})
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
