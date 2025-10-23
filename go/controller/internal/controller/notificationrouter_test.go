package controller_test

import (
	"context"

	corev1 "k8s.io/api/core/v1"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("NotificationRouter Service Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			routerName = "test"
			namespace  = "default"
			id         = "123"
		)

		ctx := context.Background()
		ns := &v1alpha1.NotificationRouter{}
		typeNamespacedName := types.NamespacedName{
			Name:      routerName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind NotificationRouter")

			err := k8sClient.Get(ctx, typeNamespacedName, ns)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.NotificationRouter{
					ObjectMeta: metav1.ObjectMeta{
						Name:      routerName,
						Namespace: namespace,
					},
					Spec: v1alpha1.NotificationRouterSpec{
						Name: lo.ToPtr(routerName),
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			ns := &v1alpha1.NotificationRouter{}
			if err := k8sClient.Get(ctx, typeNamespacedName, ns); err == nil {
				By("Cleanup the specific resource instance NotificationRouter")
				Expect(k8sClient.Delete(ctx, ns)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				notificationRouterFragment *gqlclient.NotificationRouterFragment
				expectedStatus             v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("PWP5EBI7YMVTF7VLCCKG7K3LXEKCNK36HGVFIOJIT3MJFBSKVEOQ===="),
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
				},
				notificationRouterFragment: &gqlclient.NotificationRouterFragment{
					ID: "123",
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetNotificationRouterByName", mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("UpsertNotificationRouter", mock.Anything, mock.Anything).Return(test.notificationRouterFragment, nil)
			nr := &controller.NotificationRouterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err := nr.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			mns := &v1alpha1.NotificationRouter{}
			err = k8sClient.Get(ctx, typeNamespacedName, mns)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(mns.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile the resource", func() {
			By("wait for resource")
			test := struct {
				notificationRouterFragment *gqlclient.NotificationRouterFragment
				expectedStatus             v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("PWP5EBI7YMVTF7VLCCKG7K3LXEKCNK36HGVFIOJIT3MJFBSKVEOQ===="),
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
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.ReadyConditionReason.String(),
							Message: "",
						},
						{
							Type:    v1alpha1.SynchronizedConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.SynchronizedConditionReasonError.String(),
							Message: "clusters.deployments.plural.sh \"test\" not found",
						},
					},
				},
				notificationRouterFragment: &gqlclient.NotificationRouterFragment{
					ID: "123",
				},
			}

			Expect(k8sClient.Get(ctx, typeNamespacedName, ns)).To(Succeed())
			ns.Spec.Filters = []v1alpha1.RouterFilters{
				{
					ClusterRef: &corev1.ObjectReference{
						Name:      "test",
						Namespace: namespace,
					},
				},
			}
			Expect(k8sClient.Update(ctx, ns)).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetNotificationRouter", mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			nr := &controller.NotificationRouterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			result, err := nr.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).To(Not(BeZero()))

			mns := &v1alpha1.NotificationRouter{}
			err = k8sClient.Get(ctx, typeNamespacedName, mns)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(mns.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile the resource", func() {
			By("Delete resource")
			test := struct {
				returnGetNs *gqlclient.NotificationRouterFragment
			}{
				returnGetNs: &gqlclient.NotificationRouterFragment{
					ID: "123",
				},
			}

			Expect(common.MaybePatch(k8sClient, &v1alpha1.NotificationRouter{
				ObjectMeta: metav1.ObjectMeta{Name: routerName, Namespace: namespace},
			}, func(p *v1alpha1.NotificationRouter) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.NotificationRouter{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetNotificationRouter", mock.Anything, mock.Anything).Return(test.returnGetNs, nil)
			fakeConsoleClient.On("DeleteNotificationRouter", mock.Anything, mock.Anything).Return(nil)
			nsReconciler := &controller.NotificationRouterReconciler{
				Client:           k8sClient,
				Scheme:           k8sClient.Scheme(),
				ConsoleClient:    fakeConsoleClient,
				CredentialsCache: credentials.FakeNamespaceCredentialsCache(k8sClient),
			}

			_, err = nsReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			service := &v1alpha1.NotificationRouter{}
			err = k8sClient.Get(ctx, typeNamespacedName, service)

			Expect(err.Error()).To(Equal("notificationrouters.deployments.plural.sh \"test\" not found"))
		})

	})

})
