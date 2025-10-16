package controller_test

import (
	"context"

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

var _ = Describe("Persona Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			personaName = "test"
			namespace   = "default"
			id          = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      personaName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind Persona")
			persona := &v1alpha1.Persona{}
			err := k8sClient.Get(ctx, typeNamespacedName, persona)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.Persona{
					ObjectMeta: metav1.ObjectMeta{
						Name:      personaName,
						Namespace: namespace,
					},
					Spec: v1alpha1.PersonaSpec{
						Name: lo.ToPtr(personaName),
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			persona := &v1alpha1.Persona{}
			if err := k8sClient.Get(ctx, typeNamespacedName, persona); err == nil {
				By("Cleanup the specific resource instance Persona")
				Expect(k8sClient.Delete(ctx, persona)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				personaFragment *gqlclient.PersonaFragment
				expectedStatus  v1alpha1.Status
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
				personaFragment: &gqlclient.PersonaFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsPersonaExists", mock.Anything, mock.Anything).Return(false, nil)
			fakeConsoleClient.On("CreatePersona", mock.Anything, mock.Anything).Return(test.personaFragment, nil)

			nr := &controller.PersonaReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := nr.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			persona := &v1alpha1.Persona{}
			err = k8sClient.Get(ctx, typeNamespacedName, persona)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(persona.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should requeue when binding is not ready", func() {
			Expect(common.MaybePatchObject(k8sClient, &v1alpha1.Persona{
				ObjectMeta: metav1.ObjectMeta{Name: personaName, Namespace: namespace},
			}, func(p *v1alpha1.Persona) {
				p.Spec.Bindings = []v1alpha1.Binding{
					{
						UserEmail: lo.ToPtr("user@example.com"),
					},
				}
			})).To(Succeed())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsPersonaExists", mock.Anything, mock.Anything).Return(false, nil)
			fakeConsoleClient.On("GetUser", mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, "user@example.com"))

			pr := &controller.PersonaReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			result, err := pr.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).ToNot(BeZero())
		})

		It("should update existing resource when changed", func() {
			By("Update resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Persona{
				ObjectMeta: metav1.ObjectMeta{Name: personaName, Namespace: namespace},
			}, func(p *v1alpha1.Persona) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("OLD_SHA")
				p.Spec.Description = lo.ToPtr("Updated description")
			})).To(Succeed())

			personaFragment := &gqlclient.PersonaFragment{
				ID: id,
			}
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsPersonaExists", mock.Anything, mock.Anything).Return(true, nil)
			fakeConsoleClient.On("GetUser", mock.Anything).Return(&gqlclient.UserFragment{ID: "id"}, nil)
			fakeConsoleClient.On("UpdatePersona", mock.Anything, mock.Anything, mock.Anything).Return(personaFragment, nil)

			pr := &controller.PersonaReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := pr.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())
		})

		It("should successfully reconcile the resource deletion", func() {
			By("Delete resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Persona{
				ObjectMeta: metav1.ObjectMeta{Name: personaName, Namespace: namespace},
			}, func(p *v1alpha1.Persona) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.Persona{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("UseCredentials", mock.Anything, mock.Anything).Return("", nil)
			fakeConsoleClient.On("IsPersonaExists", mock.Anything, mock.Anything).Return(true, nil)
			fakeConsoleClient.On("DeletePersona", mock.Anything, mock.Anything).Return(nil)

			nsReconciler := &controller.PersonaReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = nsReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			persona := &v1alpha1.Persona{}
			err = k8sClient.Get(ctx, typeNamespacedName, persona)

			Expect(err.Error()).To(Equal("personas.deployments.plural.sh \"test\" not found"))
		})

	})
})
