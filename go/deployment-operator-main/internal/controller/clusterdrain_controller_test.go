package controller

import (
	"context"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/pkg/test/common"
)

var _ = Describe("ClusterDrain Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			resourceName = "default"
			namespace    = "default"
		)

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: namespace,
		}

		BeforeAll(func() {
			By("creating the Deployment, DaemonSet, StatefulSet")
			Expect(common.MaybeCreate(kClient, &appsv1.Deployment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
					Labels: map[string]string{
						"selector": "drain",
					},
				},
				Spec: appsv1.DeploymentSpec{
					Replicas: lo.ToPtr(int32(3)),
					Selector: &metav1.LabelSelector{
						MatchLabels: map[string]string{"app": "nginx"},
					},
					Template: corev1.PodTemplateSpec{
						ObjectMeta: metav1.ObjectMeta{
							Labels: map[string]string{"app": "nginx"},
						},
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name:  "nginx",
									Image: "nginx:latest",
								},
							},
						},
					},
				},
			}, func(d *appsv1.Deployment) {
				d.Status.Replicas = 3
				d.Status.ReadyReplicas = 3
				d.Status.ObservedGeneration = 3
				d.Status.UpdatedReplicas = 3
				d.Status.AvailableReplicas = 3
			})).To(Succeed())
			Expect(common.MaybeCreate(kClient, &appsv1.DaemonSet{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
					Labels: map[string]string{
						"selector": "drain",
					},
				},
				Spec: appsv1.DaemonSetSpec{
					Selector: &metav1.LabelSelector{
						MatchLabels: map[string]string{"app": "nginx"},
					},
					Template: corev1.PodTemplateSpec{
						ObjectMeta: metav1.ObjectMeta{
							Labels: map[string]string{"app": "nginx"},
						},
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name:  "nginx",
									Image: "nginx:latest",
								},
							},
						},
					},
				},
			}, func(d *appsv1.DaemonSet) {
				d.Status.ObservedGeneration = 3
				d.Status.NumberAvailable = 3
				d.Status.NumberReady = 3

			})).To(Succeed())
			Expect(common.MaybeCreate(kClient, &appsv1.StatefulSet{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
					Labels: map[string]string{
						"selector": "drain",
					},
				},
				Spec: appsv1.StatefulSetSpec{
					Replicas:    lo.ToPtr(int32(3)),
					ServiceName: "nginx",
					Selector: &metav1.LabelSelector{
						MatchLabels: map[string]string{"app": "nginx"},
					},
					Template: corev1.PodTemplateSpec{
						ObjectMeta: metav1.ObjectMeta{
							Labels: map[string]string{"app": "nginx"},
						},
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name:  "nginx",
									Image: "nginx:latest",
								},
							},
						},
					},
				},
			}, func(d *appsv1.StatefulSet) {
				d.Status.ObservedGeneration = 3
				d.Status.Replicas = 3
				d.Status.ReadyReplicas = 3
				d.Status.UpdatedReplicas = 3
			})).To(Succeed())

			Expect(common.MaybeCreate(kClient, &v1alpha1.ClusterDrain{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
				},
				Spec: v1alpha1.ClusterDrainSpec{
					FlowControl: v1alpha1.FlowControl{
						MaxConcurrency: lo.ToPtr(1),
					},
					LabelSelector: &metav1.LabelSelector{
						MatchLabels: map[string]string{"selector": "drain"},
					},
				},
			}, nil)).To(Succeed())
		})

		AfterAll(func() {
			deployment := &appsv1.Deployment{}
			Expect(kClient.Get(ctx, typeNamespacedName, deployment)).NotTo(HaveOccurred())
			Expect(kClient.Delete(ctx, deployment)).To(Succeed())

			daemonset := &appsv1.DaemonSet{}
			Expect(kClient.Get(ctx, typeNamespacedName, daemonset)).NotTo(HaveOccurred())
			Expect(kClient.Delete(ctx, daemonset)).To(Succeed())

			statefulset := &appsv1.StatefulSet{}
			Expect(kClient.Get(ctx, typeNamespacedName, statefulset)).NotTo(HaveOccurred())
			Expect(kClient.Delete(ctx, statefulset)).To(Succeed())

			cd := &v1alpha1.ClusterDrain{}
			Expect(kClient.Get(ctx, typeNamespacedName, cd)).NotTo(HaveOccurred())
			Expect(kClient.Delete(ctx, cd)).To(Succeed())

		})

		It("should reconcile workloads", func() {
			r := &ClusterDrainReconciler{
				Client: kClient,
				Scheme: kClient.Scheme(),
			}

			_, err := r.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// check annotation
			deployment := &appsv1.Deployment{}
			Expect(kClient.Get(ctx, typeNamespacedName, deployment)).NotTo(HaveOccurred())
			Expect(deployment.Spec.Template.Annotations).ToNot(BeEmpty())
			Expect(deployment.Spec.Template.Annotations[drainAnnotation]).To(Equal(resourceName))

			daemonset := &appsv1.DaemonSet{}
			Expect(kClient.Get(ctx, typeNamespacedName, daemonset)).NotTo(HaveOccurred())
			Expect(daemonset.Spec.Template.Annotations).ToNot(BeEmpty())
			Expect(daemonset.Spec.Template.Annotations[drainAnnotation]).To(Equal(resourceName))

			statefulset := &appsv1.StatefulSet{}
			Expect(kClient.Get(ctx, typeNamespacedName, statefulset)).NotTo(HaveOccurred())
			Expect(statefulset.Spec.Template.Annotations).ToNot(BeEmpty())
			Expect(statefulset.Spec.Template.Annotations[drainAnnotation]).To(Equal(resourceName))

			// check status
			cd := &v1alpha1.ClusterDrain{}
			Expect(kClient.Get(ctx, typeNamespacedName, cd)).NotTo(HaveOccurred())
			Expect(len(cd.Status.Progress)).To(Equal(3))
		})
	})

})
