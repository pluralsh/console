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
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("PreviewEnvironmentTemplate Controller", Ordered, func() {
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
			By("creating the custom resource for the Kind Flow")
			flow := &v1alpha1.Flow{}
			err := k8sClient.Get(ctx, typeNamespacedName, flow)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.Flow{
					ObjectMeta: metav1.ObjectMeta{
						Name:      name,
						Namespace: namespace,
					},
					Spec: v1alpha1.FlowSpec{
						Name: lo.ToPtr(name),
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, func(object *v1alpha1.Flow) {
					object.Status.ID = lo.ToPtr(id)
				})).To(Succeed())
			}
			service := &v1alpha1.ServiceDeployment{}
			err = k8sClient.Get(ctx, typeNamespacedName, service)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.ServiceDeployment{
					ObjectMeta: metav1.ObjectMeta{
						Name:      name,
						Namespace: namespace,
					},
					Spec: v1alpha1.ServiceSpec{
						Version:       lo.ToPtr("1.24"),
						ClusterRef:    corev1.ObjectReference{Name: name, Namespace: namespace},
						RepositoryRef: &corev1.ObjectReference{Name: name, Namespace: namespace},
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, func(p *v1alpha1.ServiceDeployment) {
					p.Status.ID = lo.ToPtr(id)
				})).To(Succeed())
			}
			pet := &v1alpha1.PreviewEnvironmentTemplate{}
			err = k8sClient.Get(ctx, typeNamespacedName, pet)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.PreviewEnvironmentTemplate{
					ObjectMeta: metav1.ObjectMeta{
						Name:      name,
						Namespace: namespace,
					},
					Spec: v1alpha1.PreviewEnvironmentTemplateSpec{
						Name:                lo.ToPtr(name),
						ReferenceServiceRef: corev1.ObjectReference{Name: name, Namespace: namespace},
						FlowRef:             corev1.ObjectReference{Name: name, Namespace: namespace},
						Template:            v1alpha1.ServiceTemplate{Namespace: lo.ToPtr(namespace)},
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
			service := &v1alpha1.ServiceDeployment{}
			if err := k8sClient.Get(ctx, typeNamespacedName, service); err == nil {
				By("Cleanup the specific resource instance Service")
				Expect(k8sClient.Delete(ctx, service)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				fragment       *gqlclient.PreviewEnvironmentTemplateFragment
				expectedStatus v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("NCGX5V4YROXJXQFVEGS4W4JPYCPTHLK62GYSQKBC7Q72FODDIY6Q===="),
					Conditions: []metav1.Condition{
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
				fragment: &gqlclient.PreviewEnvironmentTemplateFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UpsertPreviewEnvironmentTemplate", mock.Anything, mock.Anything).Return(test.fragment, nil)

			nr := &controller.PreviewEnvironmentTemplateReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := nr.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			f := &v1alpha1.PreviewEnvironmentTemplate{}
			err = k8sClient.Get(ctx, typeNamespacedName, f)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(f.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		//It("should successfully reconcile the resource", func() {
		//	By("Delete resource")
		//	Expect(common.MaybePatch(k8sClient, &v1alpha1.Flow{
		//		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		//	}, func(p *v1alpha1.Flow) {
		//		p.Status.ID = lo.ToPtr(id)
		//		p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
		//	})).To(Succeed())
		//	resource := &v1alpha1.Flow{}
		//	err := k8sClient.Get(ctx, typeNamespacedName, resource)
		//	Expect(err).NotTo(HaveOccurred())
		//	err = k8sClient.Delete(ctx, resource)
		//	Expect(err).NotTo(HaveOccurred())
		//
		//	flowFragment := &gqlclient.FlowFragment{
		//		ID: id,
		//	}
		//	fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
		//	fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
		//	fakeConsoleClient.On("GetFlow", mock.Anything, mock.Anything, mock.Anything).Return(flowFragment, nil)
		//	fakeConsoleClient.On("DeleteFlow", mock.Anything, mock.Anything).Return(nil)
		//
		//	nsReconciler := &controller.FlowReconciler{
		//		Client:        k8sClient,
		//		Scheme:        k8sClient.Scheme(),
		//		ConsoleClient: fakeConsoleClient,
		//	}
		//
		//	_, err = nsReconciler.Reconcile(ctx, reconcile.Request{
		//		NamespacedName: typeNamespacedName,
		//	})
		//
		//	Expect(err).NotTo(HaveOccurred())
		//
		//	flow := &v1alpha1.Flow{}
		//	err = k8sClient.Get(ctx, typeNamespacedName, flow)
		//
		//	Expect(err.Error()).To(Equal("flows.deployments.plural.sh \"test\" not found"))
		//})

	})

})
