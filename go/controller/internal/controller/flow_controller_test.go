package controller_test

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/pluralsh/console/go/controller/internal/cache"
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
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("Flow Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			flowName  = "test"
			namespace = "default"
			id        = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      flowName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind Flow")
			flow := &v1alpha1.Flow{}
			err := k8sClient.Get(ctx, typeNamespacedName, flow)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.Flow{
					ObjectMeta: metav1.ObjectMeta{
						Name:      flowName,
						Namespace: namespace,
					},
					Spec: v1alpha1.FlowSpec{
						Name: lo.ToPtr(flowName),
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			flow := &v1alpha1.Flow{}
			if err := k8sClient.Get(ctx, typeNamespacedName, flow); err == nil {
				By("Cleanup the specific resource instance Flow")
				Expect(k8sClient.Delete(ctx, flow)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				flowFragment   *gqlclient.FlowFragment
				expectedStatus v1alpha1.Status
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
				flowFragment: &gqlclient.FlowFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetFlow", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("UpsertFlow", mock.Anything, mock.Anything).Return(test.flowFragment, nil)

			nr := &controller.FlowReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := nr.Process(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			flw := &v1alpha1.Flow{}
			err = k8sClient.Get(ctx, typeNamespacedName, flw)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(flw.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should requeue when binding is not ready", func() {
			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.Flow{
				ObjectMeta: metav1.ObjectMeta{Name: flowName, Namespace: namespace},
			}, func(p *v1alpha1.Flow) {
				p.Spec.Bindings = &v1alpha1.Bindings{
					Read: []v1alpha1.Binding{
						{
							UserEmail: lo.ToPtr("user@example.com"),
						},
					},
				}
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetFlow", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("GetUser", mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, "user@example.com"))

			fr := &controller.FlowReconciler{
				Client:         k8sClient,
				Scheme:         k8sClient.Scheme(),
				ConsoleClient:  fakeConsoleClient,
				UserGroupCache: cache.NewUserGroupCache(fakeConsoleClient),
			}

			result, err := fr.Process(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).ToNot(BeZero())
		})

		It("should successfully reconcile the resource", func() {
			By("Delete resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Flow{
				ObjectMeta: metav1.ObjectMeta{Name: flowName, Namespace: namespace},
			}, func(p *v1alpha1.Flow) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.Flow{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			flowFragment := &gqlclient.FlowFragment{
				ID: id,
			}
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("GetFlow", mock.Anything, mock.Anything, mock.Anything).Return(flowFragment, nil)
			fakeConsoleClient.On("DeleteFlow", mock.Anything, mock.Anything).Return(nil)

			nsReconciler := &controller.FlowReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = nsReconciler.Process(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			flow := &v1alpha1.Flow{}
			err = k8sClient.Get(ctx, typeNamespacedName, flow)

			Expect(err.Error()).To(Equal("flows.deployments.plural.sh \"test\" not found"))
		})

	})

})
