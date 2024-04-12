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
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

var _ = Describe("NotificationRouter Service Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			routerName = "test"
			namespace  = "default"
			id         = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      routerName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind NotificationRouter")
			ns := &v1alpha1.NotificationRouter{}
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
			fakeConsoleClient.On("GetNotificationRouterByName", mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("UpsertNotificationRouter", mock.Anything, mock.Anything).Return(test.notificationRouterFragment, nil)
			nr := &controller.NotificationRouterReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
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
			fakeConsoleClient.On("GetNotificationRouter", mock.Anything, mock.Anything).Return(test.returnGetNs, nil)
			fakeConsoleClient.On("DeleteNotificationRouter", mock.Anything, mock.Anything).Return(nil)
			nsReconciler := &controller.NotificationRouterReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
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
