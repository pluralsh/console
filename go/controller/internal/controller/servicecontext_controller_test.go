package controller_test

import (
	"context"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("ServiceContext Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			name      = "test"
			namespace = "default"
			id        = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      name,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind ServiceContext")
			sc := &v1alpha1.ServiceContext{}
			err := k8sClient.Get(ctx, typeNamespacedName, sc)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.ServiceContext{
					ObjectMeta: metav1.ObjectMeta{
						Name:      name,
						Namespace: namespace,
					},
					Spec: v1alpha1.ServiceContextSpec{
						Configuration: runtime.RawExtension{Raw: []byte(`{"foo":"bar"}`)},
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			sc := &v1alpha1.ServiceContext{}
			if err := k8sClient.Get(ctx, typeNamespacedName, sc); err == nil {
				By("Cleanup the specific resource instance ServiceContext")
				Expect(k8sClient.Delete(ctx, sc)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				fragment       *gqlclient.ServiceContextFragment
				expectedStatus v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("Z5PGHG2MVCGI7PUAFZC7PQ5KRNEPBBBJCZA7KBFHUQYAOXBMI4KA===="),
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
				fragment: &gqlclient.ServiceContextFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetServiceContext", mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, name))
			fakeConsoleClient.On("IsServiceContextExists", mock.Anything).Return(false, nil)
			fakeConsoleClient.On("SaveServiceContext", mock.Anything, mock.Anything).Return(test.fragment, nil)

			nr := &controller.ServiceContextReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := nr.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			f := &v1alpha1.ServiceContext{}
			err = k8sClient.Get(ctx, typeNamespacedName, f)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(f.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile readonly the resource", func() {
			By("Create readonly resource")
			test := struct {
				fragment       *gqlclient.ServiceContextFragment
				expectedStatus v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: nil,
					Conditions: []metav1.Condition{
						{
							Type:    v1alpha1.ReadonlyConditionType.String(),
							Status:  metav1.ConditionTrue,
							Reason:  v1alpha1.ReadonlyConditionReason.String(),
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
				fragment: &gqlclient.ServiceContextFragment{
					ID: id,
				},
			}
			sc := &v1alpha1.ServiceContext{}
			err := k8sClient.Get(ctx, typeNamespacedName, sc)
			Expect(common.MaybePatch(k8sClient, sc, func(object *v1alpha1.ServiceContext) {
				object.Status = v1alpha1.Status{}
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetServiceContext", mock.Anything).Return(nil, nil).Once()
			fakeConsoleClient.On("IsServiceContextExists", mock.Anything).Return(true, nil)
			fakeConsoleClient.On("GetServiceContext", mock.Anything).Return(test.fragment, nil).Once()

			nr := &controller.ServiceContextReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = nr.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			f := &v1alpha1.ServiceContext{}
			err = k8sClient.Get(ctx, typeNamespacedName, f)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(f.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

	})

})
