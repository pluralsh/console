package controller

import (
	"context"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	discoverycache "github.com/pluralsh/deployment-operator/pkg/cache/discovery"
)

type TestReconciler struct{}

func (r *TestReconciler) SetupWithManager(_ ctrl.Manager) error {
	return nil
}

var _ = Describe("CRD Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			resourceName = "testresources.test.group"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: "default",
		}

		testReconciler := TestReconciler{}
		reconcileGroups := map[schema.GroupVersionKind]SetupWithManager{
			{
				Group:   "test.group",
				Version: "v1",
				Kind:    "TestResource",
			}: testReconciler.SetupWithManager,
		}

		crd := &apiextensionsv1.CustomResourceDefinition{
			ObjectMeta: metav1.ObjectMeta{
				Name: "testresources.test.group",
			},
			Spec: apiextensionsv1.CustomResourceDefinitionSpec{
				Group: "test.group",
				Names: apiextensionsv1.CustomResourceDefinitionNames{
					Plural:     "testresources",
					Singular:   "testresource",
					Kind:       "TestResource",
					ListKind:   "TestResourceList",
					ShortNames: []string{"tr"},
				},
				Scope: apiextensionsv1.NamespaceScoped,
				Versions: []apiextensionsv1.CustomResourceDefinitionVersion{
					{
						Name:    "v1",
						Served:  true,
						Storage: true,
						Schema: &apiextensionsv1.CustomResourceValidation{
							OpenAPIV3Schema: &apiextensionsv1.JSONSchemaProps{
								Type: "object",
								Properties: map[string]apiextensionsv1.JSONSchemaProps{
									"spec": {
										Type: "object",
										Properties: map[string]apiextensionsv1.JSONSchemaProps{
											"name": {
												Type: "string",
											},
											"value": {
												Type: "string",
											},
										},
									},
									"status": {
										Type:       "object",
										Properties: map[string]apiextensionsv1.JSONSchemaProps{},
									},
								},
							},
						},
					},
				},
			},
		}

		BeforeAll(func() {
			By("creating the custom resource")
			err := kClient.Get(ctx, typeNamespacedName, &apiextensionsv1.CustomResourceDefinition{})
			if err != nil {
				Expect(errors.IsNotFound(err)).To(BeTrue(), "Unexpected error getting CustomResourceDefinition: %v", err)
				Expect(kClient.Create(ctx, crd)).To(Succeed())
			}
		})

		AfterAll(func() {
			resource := &apiextensionsv1.CustomResourceDefinition{}
			err := kClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific CRD")
			Expect(kClient.Delete(ctx, resource)).To(Succeed())
		})

		It("should successfully reconcile resource", func() {

			cache := discoverycache.NewCache(discoveryClient, mapper)

			err := discoverycache.NewDiscoveryManager(
				discoverycache.WithRefreshInterval(time.Millisecond),
				discoverycache.WithCache(cache),
			).Start(ctx)
			Expect(err).NotTo(HaveOccurred())

			reconciler := &CrdRegisterControllerReconciler{
				Client:           kClient,
				Scheme:           kClient.Scheme(),
				ReconcilerGroups: reconcileGroups,
				DiscoveryCache:   cache,
			}

			_, err = reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())
			Expect(reconciler.registeredControllers).ToNot(BeNil())
			Expect(reconciler.registeredControllers).To(HaveLen(1))
		})
	})

})
