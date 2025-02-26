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

var _ = Describe("Catalog Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			author      = "test@plural.sh"
			catalogName = "test"
			namespace   = "default"
			id          = "123"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      catalogName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the custom resource for the Kind Catalog")
			catalog := &v1alpha1.Catalog{}
			err := k8sClient.Get(ctx, typeNamespacedName, catalog)
			if err != nil && errors.IsNotFound(err) {
				resource := &v1alpha1.Catalog{
					ObjectMeta: metav1.ObjectMeta{
						Name:      catalogName,
						Namespace: namespace,
					},
					Spec: v1alpha1.CatalogSpec{
						Author: author,
					},
				}
				Expect(common.MaybeCreate(k8sClient, resource, nil)).To(Succeed())
			}
		})

		AfterAll(func() {
			catalog := &v1alpha1.Catalog{}
			if err := k8sClient.Get(ctx, typeNamespacedName, catalog); err == nil {
				By("Cleanup the specific resource instance Catalog")
				Expect(k8sClient.Delete(ctx, catalog)).To(Succeed())
			}
		})

		It("should successfully reconcile the resource", func() {
			By("Create resource")
			test := struct {
				catalogFragment *gqlclient.CatalogFragment
				expectedStatus  v1alpha1.Status
			}{
				expectedStatus: v1alpha1.Status{
					ID:  lo.ToPtr("123"),
					SHA: lo.ToPtr("CRG6KJ3SGV5U7RW5SGUEULFPE5G2RL33FB7NZCU2VT7ISA4VOQHA===="),
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
				catalogFragment: &gqlclient.CatalogFragment{
					ID: id,
				},
			}

			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetCatalog", mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.NewNotFound(schema.GroupResource{}, id))
			fakeConsoleClient.On("UpsertCatalog", mock.Anything, mock.Anything).Return(test.catalogFragment, nil)

			nr := &controller.CatalogReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err := nr.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			mns := &v1alpha1.Catalog{}
			err = k8sClient.Get(ctx, typeNamespacedName, mns)

			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(mns.Status)).To(Equal(common.SanitizeStatusConditions(test.expectedStatus)))
		})

		It("should successfully reconcile the resource", func() {
			By("Delete resource")
			Expect(common.MaybePatch(k8sClient, &v1alpha1.Catalog{
				ObjectMeta: metav1.ObjectMeta{Name: catalogName, Namespace: namespace},
			}, func(p *v1alpha1.Catalog) {
				p.Status.ID = lo.ToPtr(id)
				p.Status.SHA = lo.ToPtr("WAXTBLTM6PFWW6BBRLCPV2ILX2J4EOHQKDISWH4QAM5IODNRMBJQ====")
			})).To(Succeed())
			resource := &v1alpha1.Catalog{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())
			err = k8sClient.Delete(ctx, resource)
			Expect(err).NotTo(HaveOccurred())

			catalogFragment := &gqlclient.CatalogFragment{
				ID: id,
			}
			fakeConsoleClient := mocks.NewConsoleClientMock(mocks.TestingT)
			fakeConsoleClient.On("IsCatalogExists", mock.Anything, mock.Anything).Return(true, nil)
			fakeConsoleClient.On("GetCatalog", mock.Anything, mock.Anything, mock.Anything).Return(catalogFragment, nil)
			fakeConsoleClient.On("DeleteCatalog", mock.Anything, mock.Anything).Return(nil)

			nsReconciler := &controller.CatalogReconciler{
				Client:        k8sClient,
				Scheme:        k8sClient.Scheme(),
				ConsoleClient: fakeConsoleClient,
			}

			_, err = nsReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})

			Expect(err).NotTo(HaveOccurred())

			catalog := &v1alpha1.Catalog{}
			err = k8sClient.Get(ctx, typeNamespacedName, catalog)

			Expect(err.Error()).To(Equal("catalogs.deployments.plural.sh \"test\" not found"))
		})

	})

})
