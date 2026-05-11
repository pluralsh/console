package controller

import (
	"context"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	velerov1 "github.com/vmware-tanzu/velero/pkg/apis/velero/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/pkg/controller/service"
)

var _ = Describe("Restore Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			resourceName = "default"
			namespace    = "default"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: "default",
		}

		restore := &velerov1.Restore{}

		BeforeAll(func() {
			By("creating the custom resource for the Kind Restore")
			err := kClient.Get(ctx, typeNamespacedName, restore)
			if err != nil {
				Expect(errors.IsNotFound(err)).To(BeTrue(), "Unexpected error getting Restore: %v", err)
				resource := &velerov1.Restore{
					ObjectMeta: metav1.ObjectMeta{
						Name:      resourceName,
						Namespace: namespace,
					},
					Spec: velerov1.RestoreSpec{},
					Status: velerov1.RestoreStatus{
						Phase: velerov1.RestorePhaseInProgress,
						StartTimestamp: &metav1.Time{
							Time: time.Now(),
						},
					},
				}
				Expect(kClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterAll(func() {
			resource := &velerov1.Restore{}
			err := kClient.Get(ctx, typeNamespacedName, resource)
			Expect(err).NotTo(HaveOccurred())

			By("Cleanup the specific resource instance Backup")
			Expect(kClient.Delete(ctx, resource)).To(Succeed())
		})

		It("should successfully reconcile resource and create config map", func() {
			reconciler := &RestoreReconciler{
				Client: kClient,
				Scheme: kClient.Scheme(),
			}
			_, err := reconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())
			Expect(kClient.Get(ctx, types.NamespacedName{Name: service.RestoreConfigMapName, Namespace: namespace}, &corev1.ConfigMap{})).To(Succeed())
		})
	})

})
