package controller_test

import (
	"context"

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
	common "github.com/pluralsh/console/go/controller/internal/test/common"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

var _ = Describe("Project Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			projectName = "test"
			namespace   = "default"
			id          = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      projectName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind Project")
			resource := &v1alpha1.Project{
				ObjectMeta: metav1.ObjectMeta{
					Name:      projectName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ProjectSpec{
					Name: projectName,
				},
			}
			Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
		})

		AfterAll(func() {
			project := &v1alpha1.Project{}
			if err := k8sClient.Get(ctx, typeNamespacedName, project); err == nil {
				By("Cleanup the specific resource instance Project")
				Expect(k8sClient.Delete(ctx, project)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				projectFragment *gqlclient.ProjectFragment
				expectedStatus  v1alpha1.Status
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
				projectFragment: &gqlclient.ProjectFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("common.GetProject", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("IsProjectExists", mock.Anything, mock.Anything, mock.Anything).Return(false, nil)
			fakeConsoleClient.On("CreateProject", mock.Anything, mock.Anything).Return(test.projectFragment, nil)

			nr := &controller.ProjectReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := nr.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			mns := &v1alpha1.Project{}
			err = k8sClient.Get(ctx, typeNamespacedName, mns)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(mns.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should Wait for bindings", func() {
			By("Create resource")
			test := struct {
				projectFragment *gqlclient.ProjectFragment
				expectedStatus  v1alpha1.Status
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
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.ReadyConditionReason.String(),
							Message: "",
						},
						{
							Type:    v1alpha1.SynchronizedConditionType.String(),
							Status:  metav1.ConditionFalse,
							Reason:  v1alpha1.SynchronizedConditionReasonError.String(),
							Message: " \"test@plural.sh\" not found",
						},
					},
				},
				projectFragment: &gqlclient.ProjectFragment{
					ID: id,
				},
			}
			project := &v1alpha1.Project{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, project)).To(Succeed())
			project.Spec.Bindings = &v1alpha1.Bindings{
				Read: []v1alpha1.Binding{
					{
						UserEmail: lo.ToPtr("test@plural.sh"),
					},
				},
			}
			Expect(k8sClient.Update(ctx, project)).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("common.GetProject", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("IsProjectExists", mock.Anything, mock.Anything, mock.Anything).Return(true, nil)
			fakeConsoleClient.On("GetUser", mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, "test@plural.sh"))

			nsReconciler := &controller.ProjectReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			result, err := nsReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).ToNot(BeZero())

			service := &v1alpha1.Project{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, service)).To(Succeed())
			Expect(common.SanitizeStatusConditions(service.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))

		})

		It("should successfully reconcile the resource", func() {
			By("Delete resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Project{
				ObjectMeta: metav1.ObjectMeta{Name: projectName, Namespace: namespace},
			}, func(p *v1alpha1.Project) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.Project{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("common.GetProject", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("IsProjectExists", mock.Anything, mock.Anything, mock.Anything).Return(true, nil)
			fakeConsoleClient.On("DeleteProject", mock.Anything, mock.Anything).Return(nil)

			nsReconciler := &controller.ProjectReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = nsReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			service := &v1alpha1.Project{}
			err = k8sClient.Get(ctx, typeNamespacedName, service)

			Expect(err.Error()).To(Equal("projects.deployments.plural.sh \"test\" not found"))
		})

	})

})
