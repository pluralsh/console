package controller

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

var _ = Describe("Customhealt Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			resourceName      = "default"
			resourceNameOther = "apps-v1-deployment"
			namespace         = "default"
			script            = `healthStatus = { status = "Healthy" }`
			scriptOther       = `healthStatus = { status = "Progressing" }`
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: "default",
		}

		typeNamespacedNameOther := types.NamespacedName{
			Name:      resourceNameOther,
			Namespace: "default",
		}

		customHealth := &v1alpha1.CustomHealth{}
		customHealthOther := &v1alpha1.CustomHealth{}

		BeforeAll(func() {
			By("clearing Lua scripts for test isolation")
			common.ClearLuaScripts()

			By("creating the custom resource for the Kind CustomHealth")
			err := kClient.Get(ctx, typeNamespacedName, customHealth)
			if err != nil {
				Expect(errors.IsNotFound(err)).To(BeTrue(), "Unexpected error getting CustomHealth: %v", err)
				resource := &v1alpha1.CustomHealth{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
					},
					Spec: v1alpha1.CustomHealthSpec{
						Script: script,
					},
				}
				Expect(kClient.Create(ctx, resource)).To(Succeed())
			}

			err = kClient.Get(ctx, typeNamespacedNameOther, customHealthOther)
			if err != nil {
				Expect(errors.IsNotFound(err)).To(BeTrue(), "Unexpected error getting CustomHealth: %v", err)
				resource := &v1alpha1.CustomHealth{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceNameOther,
						Namespace: namespace,
					},
					Spec: v1alpha1.CustomHealthSpec{
						Script:  scriptOther,
						Group:   "apps",
						Version: "v1",
						Kind:    "Deployment",
					},
				}
				Expect(kClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterAll(func() {
			common.ClearLuaScripts()

			resource := &v1alpha1.CustomHealth{}
			err := kClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance CustomHealth")
			Expect(kClient.Delete(ctx, resource)).To(Succeed())

			resourceOther := &v1alpha1.CustomHealth{}
			err = kClient.Get(ctx, typeNamespacedNameOther, resourceOther)
			Expect(err).NotTo(HaveOccurred())
			Expect(kClient.Delete(ctx, resourceOther)).To(Succeed())
		})

		It("should successfully reconcile resource", func() {
			By("Reconciling the import resource")
			reconciler := &CustomHealthReconciler{
				Client: kClient,
				Scheme: kClient.Scheme(),
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			_, err = reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedNameOther,
			})
			Expect(err).NotTo(HaveOccurred())

			// Verify scripts are stored independently by GVK
			Expect(common.GetLuaScriptForGVK(schema.GroupVersionKind{})).Should(Equal(script), "Default GVK should have default resource script")
			Expect(common.GetLuaScriptForGVK(schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "Deployment"})).Should(Equal(scriptOther), "apps/v1/Deployment should have its own script")
			Expect(common.GetLuaScriptForGVK(schema.GroupVersionKind{Group: "batch", Version: "v1", Kind: "Job"})).Should(BeEmpty(), "Non-existent GVK should return empty string")

		})
	})

})
