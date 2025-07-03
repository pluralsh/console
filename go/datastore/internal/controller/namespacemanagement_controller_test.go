package controller_test

import (
	"context"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/pluralsh/console/go/datastore/api/v1alpha1"
	"github.com/pluralsh/console/go/datastore/internal/controller"
	"github.com/pluralsh/console/go/datastore/internal/test/common"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

var _ = Describe("NamespaceManagement Controller", func() {
	Context("When reconciling a resource", func() {
		const (
			resourceName = "test-namespace-management"
			namespace    = "default"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: namespace,
		}
		ns := &v1.Namespace{}
		managedNs := &v1alpha1.NamespaceManagement{}
		BeforeEach(func() {
			err := k8sClient.Get(ctx, types.NamespacedName{Name: resourceName}, ns)
			if err != nil && errors.IsNotFound(err) {
				Expect(common.MaybeCreate(k8sClient, &v1.Namespace{
					ObjectMeta: metav1.ObjectMeta{
						Name: resourceName,
					},
				}, nil)).To(Succeed())
			}
			By("creating the custom resource for the Kind NamespaceManagement")
			err = k8sClient.Get(ctx, typeNamespacedName, managedNs)
			if err != nil && errors.IsNotFound(err) {
				nm := &v1alpha1.NamespaceManagement{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
					},
					Spec: v1alpha1.NamespaceManagementSpec{
						Interval: "1h",
						Sentinel: v1alpha1.Sentinel{
							Kind:       "Deployment",
							Name:       "test",
							APIVersion: "apps/v1",
						},
						NamespacePattern: resourceName,
					},
				}
				Expect(k8sClient.Create(ctx, nm)).To(Succeed())
			}
			// to make sure the namespace is old enough
			time.Sleep(2 * time.Second)
		})

		AfterEach(func() {
			resource := &v1alpha1.NamespaceManagement{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance NamespaceManagement")
			Expect(k8sClient.Delete(ctx, resource)).To(Succeed())

		})
		It("should successfully reconcile the resource", func() {
			By("Reconciling the created resource")

			expectedStatus := v1alpha1.Status{
				Conditions: []metav1.Condition{
					{
						Type:    v1alpha1.ReadyConditionType.String(),
						Status:  metav1.ConditionTrue,
						Reason:  v1alpha1.ReadyConditionReason.String(),
						Message: "",
					},
				},
			}

			controllerReconciler := &controller.NamespaceManagementReconciler{
				Client:          k8sClient,
				Scheme:          k8sClient.Scheme(),
				MaxNamespaceAge: time.Second,
			}

			res, err := controllerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: typeNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(res.RequeueAfter).To(Equal(time.Hour))

			nm := &v1alpha1.NamespaceManagement{}
			err = k8sClient.Get(ctx, typeNamespacedName, nm)
			Expect(err).NotTo(HaveOccurred())
			Expect(common.SanitizeStatusConditions(nm.Status)).To(Equal(common.SanitizeStatusConditions(expectedStatus)))

			// namespace should be deleted
			ns := &v1.Namespace{}
			err = k8sClient.Get(ctx, types.NamespacedName{Name: resourceName}, ns)
			Expect(err).ToNot(HaveOccurred())
			Expect(ns.DeletionTimestamp).NotTo(BeNil())
		})
	})
})
