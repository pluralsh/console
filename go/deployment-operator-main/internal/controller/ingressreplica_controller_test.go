package controller

import (
	"context"
	"sort"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	networkv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/pkg/test/common"
)

var _ = Describe("IngressReplica Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			ingressReplicaName = "ingress-replica-name"
			ingressName        = "old-ingress"
			namespace          = "default"
		)

		ctx := context.Background()

		namespacedName := types.NamespacedName{Name: ingressReplicaName, Namespace: namespace}
		ingressNamespacedName := types.NamespacedName{Name: ingressName, Namespace: namespace}

		ingressReplica := &v1alpha1.IngressReplica{}
		oldIngress := &networkv1.Ingress{}

		BeforeAll(func() {
			By("Creating IngressReplica")
			err := kClient.Get(ctx, namespacedName, ingressReplica)
			if err != nil {
				Expect(errors.IsNotFound(err)).To(BeTrue(), "Unexpected error getting IngressReplica: %v", err)
				resource := &v1alpha1.IngressReplica{
					ObjectMeta: metav1.ObjectMeta{
						Name:      ingressReplicaName,
						Namespace: namespace,
					},
					Spec: v1alpha1.IngressReplicaSpec{
						IngressRef: corev1.ObjectReference{
							Name:      ingressName,
							Namespace: namespace,
						},
						HostMappings: map[string]string{
							"example.com": "test.example.com",
						},
					},
				}
				Expect(kClient.Create(ctx, resource)).To(Succeed())
			}
			By("Creating Ingress")
			err = kClient.Get(ctx, ingressNamespacedName, oldIngress)
			if err != nil {
				Expect(errors.IsNotFound(err)).To(BeTrue(), "Unexpected error getting Ingress: %v", err)
				resource := &networkv1.Ingress{
					ObjectMeta: metav1.ObjectMeta{
						Name:      ingressName,
						Namespace: namespace,
					},
					Spec: networkv1.IngressSpec{
						Rules: []networkv1.IngressRule{
							{
								Host:             "test",
								IngressRuleValue: networkv1.IngressRuleValue{},
							},
						},
					},
				}
				Expect(kClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterAll(func() {
			By("Cleanup ingress replica resources")
			oldIngress := &networkv1.Ingress{}
			Expect(kClient.Get(ctx, ingressNamespacedName, oldIngress)).NotTo(HaveOccurred())
			Expect(kClient.Delete(ctx, oldIngress)).To(Succeed())

			By("Cleanup ingress replica")
			ingressReplica := &v1alpha1.IngressReplica{}
			Expect(kClient.Get(ctx, namespacedName, ingressReplica)).NotTo(HaveOccurred())
			Expect(kClient.Delete(ctx, ingressReplica)).To(Succeed())
		})

		It("create ingress", func() {
			reconciler := &IngressReplicaReconciler{
				Client: kClient,
				Scheme: kClient.Scheme(),
			}
			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())

			newIngress := &networkv1.Ingress{}
			Expect(kClient.Get(ctx, namespacedName, newIngress)).NotTo(HaveOccurred())

			err = kClient.Get(ctx, namespacedName, ingressReplica)
			Expect(err).NotTo(HaveOccurred())
			Expect(SanitizeStatusConditions(ingressReplica.Status)).To(Equal(SanitizeStatusConditions(v1alpha1.Status{
				SHA: lo.ToPtr("AIIbIUr_ACMBXW2BfE5owjRhulcwk-7QzlueUQdceqk"),
				Conditions: []metav1.Condition{
					{
						Type:    v1alpha1.ReadyConditionType.String(),
						Status:  metav1.ConditionTrue,
						Reason:  v1alpha1.ReadyConditionReason.String(),
						Message: "",
					},
				},
			})))

		})

		It("update ingress", func() {
			reconciler := &IngressReplicaReconciler{
				Client: kClient,
				Scheme: kClient.Scheme(),
			}

			Expect(common.MaybePatch(kClient, &v1alpha1.IngressReplica{
				ObjectMeta: metav1.ObjectMeta{Name: ingressReplicaName, Namespace: namespace},
			}, func(p *v1alpha1.IngressReplica) {
				p.Status.SHA = lo.ToPtr("diff-sha")
			})).To(Succeed())

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: namespacedName})
			Expect(err).NotTo(HaveOccurred())
			err = kClient.Get(ctx, namespacedName, ingressReplica)
			Expect(err).NotTo(HaveOccurred())
			Expect(SanitizeStatusConditions(ingressReplica.Status)).To(Equal(SanitizeStatusConditions(v1alpha1.Status{
				SHA: lo.ToPtr("AIIbIUr_ACMBXW2BfE5owjRhulcwk-7QzlueUQdceqk"),
				Conditions: []metav1.Condition{
					{
						Type:    v1alpha1.ReadyConditionType.String(),
						Status:  metav1.ConditionTrue,
						Reason:  v1alpha1.ReadyConditionReason.String(),
						Message: "",
					},
				},
			})))

		})

	})
})

func SanitizeStatusConditions(status v1alpha1.Status) v1alpha1.Status {
	for i := range status.Conditions {
		status.Conditions[i].LastTransitionTime = metav1.Time{}
		status.Conditions[i].ObservedGeneration = 0
	}

	sort.Slice(status.Conditions, func(i, j int) bool {
		return status.Conditions[i].Type < status.Conditions[j].Type
	})

	return status
}
