package controller

import (
	"context"
	"testing"
	"time"

	. "github.com/onsi/gomega"
	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestImageWarmerReconcile(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(v1alpha1.AddToScheme(scheme)).To(Succeed())
	g.Expect(appsv1.AddToScheme(scheme)).To(Succeed())

	startedAt := time.Now()
	warmer := &v1alpha1.ImageWarmer{
		ObjectMeta: metav1.ObjectMeta{Name: "runtime", Namespace: "agents"},
		Spec: v1alpha1.ImageWarmerSpec{
			Cron:  "0 * * * *",
			Image: "example.com/repository:v1",
		},
	}
	k8sClient := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&v1alpha1.ImageWarmer{}, &appsv1.DaemonSet{}).
		WithObjects(warmer).
		Build()
	reconciler := &ImageWarmerReconciler{
		Client: k8sClient,
		Scheme: scheme,
	}
	request := ctrl.Request{NamespacedName: types.NamespacedName{Name: warmer.Name, Namespace: warmer.Namespace}}

	result, err := reconciler.Reconcile(context.Background(), request)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(result.RequeueAfter).To(Equal(imageWarmerPollInterval))

	daemonSet := &appsv1.DaemonSet{}
	g.Expect(k8sClient.Get(context.Background(), request.NamespacedName, daemonSet)).To(Succeed())
	daemonSet.Status.ObservedGeneration = daemonSet.Generation
	daemonSet.Status.DesiredNumberScheduled = 2
	daemonSet.Status.NumberReady = 2
	g.Expect(k8sClient.Status().Update(context.Background(), daemonSet)).To(Succeed())

	result, err = reconciler.Reconcile(context.Background(), request)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(result.RequeueAfter).To(BeNumerically(">", 0))
	g.Expect(result.RequeueAfter).To(BeNumerically("<=", time.Hour))
	g.Expect(k8sClient.Get(context.Background(), request.NamespacedName, &appsv1.DaemonSet{})).NotTo(Succeed())

	completedAt := time.Now()
	updated := &v1alpha1.ImageWarmer{}
	g.Expect(k8sClient.Get(context.Background(), request.NamespacedName, updated)).To(Succeed())
	g.Expect(updated.Status.LastScheduleTime).NotTo(BeNil())
	g.Expect(updated.Status.LastScheduleTime.Time.Before(startedAt.Add(-time.Second))).To(BeFalse())
	g.Expect(updated.Status.LastScheduleTime.Time.After(completedAt.Add(time.Second))).To(BeFalse())
	g.Expect(updated.Status.LastSuccessfulTime).NotTo(BeNil())
	g.Expect(updated.Status.LastSuccessfulTime.Time.Before(startedAt.Add(-time.Second))).To(BeFalse())
	g.Expect(updated.Status.LastSuccessfulTime.Time.After(completedAt.Add(time.Second))).To(BeFalse())
}

func TestImageWarmerDoesNotCompleteWithoutScheduledNodes(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(v1alpha1.AddToScheme(scheme)).To(Succeed())
	g.Expect(appsv1.AddToScheme(scheme)).To(Succeed())

	warmer := &v1alpha1.ImageWarmer{
		ObjectMeta: metav1.ObjectMeta{Name: "runtime", Namespace: "agents"},
		Spec: v1alpha1.ImageWarmerSpec{
			Cron:  "0 * * * *",
			Image: "example.com/repository:v1",
		},
	}
	k8sClient := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&v1alpha1.ImageWarmer{}, &appsv1.DaemonSet{}).
		WithObjects(warmer).
		Build()
	reconciler := &ImageWarmerReconciler{Client: k8sClient, Scheme: scheme}
	request := ctrl.Request{NamespacedName: types.NamespacedName{Name: warmer.Name, Namespace: warmer.Namespace}}

	_, err := reconciler.Reconcile(context.Background(), request)
	g.Expect(err).NotTo(HaveOccurred())

	daemonSet := &appsv1.DaemonSet{}
	g.Expect(k8sClient.Get(context.Background(), request.NamespacedName, daemonSet)).To(Succeed())
	daemonSet.Status.ObservedGeneration = daemonSet.Generation
	daemonSet.Status.DesiredNumberScheduled = 0
	daemonSet.Status.NumberReady = 0
	g.Expect(k8sClient.Status().Update(context.Background(), daemonSet)).To(Succeed())

	result, err := reconciler.Reconcile(context.Background(), request)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(result.RequeueAfter).To(Equal(imageWarmerPollInterval))
	g.Expect(k8sClient.Get(context.Background(), request.NamespacedName, &appsv1.DaemonSet{})).To(Succeed())

	updated := &v1alpha1.ImageWarmer{}
	g.Expect(k8sClient.Get(context.Background(), request.NamespacedName, updated)).To(Succeed())
	g.Expect(updated.Status.LastSuccessfulTime).To(BeNil())
}

func TestImageWarmerDoesNotDeleteForeignDaemonSet(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(v1alpha1.AddToScheme(scheme)).To(Succeed())
	g.Expect(appsv1.AddToScheme(scheme)).To(Succeed())

	warmer := &v1alpha1.ImageWarmer{
		ObjectMeta: metav1.ObjectMeta{Name: "runtime", Namespace: "agents"},
		Spec: v1alpha1.ImageWarmerSpec{
			Cron:  "0 * * * *",
			Image: "example.com/repository:v1",
		},
	}
	foreign := &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{Name: warmer.Name, Namespace: warmer.Namespace},
	}
	k8sClient := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&v1alpha1.ImageWarmer{}, &appsv1.DaemonSet{}).
		WithObjects(warmer, foreign).
		Build()
	reconciler := &ImageWarmerReconciler{Client: k8sClient, Scheme: scheme}
	request := ctrl.Request{NamespacedName: types.NamespacedName{Name: warmer.Name, Namespace: warmer.Namespace}}

	_, err := reconciler.Reconcile(context.Background(), request)
	g.Expect(err).To(MatchError(ContainSubstring("is not controlled by ImageWarmer")))
	g.Expect(k8sClient.Get(context.Background(), request.NamespacedName, &appsv1.DaemonSet{})).To(Succeed())
}

func TestImageWarmerDaemonSet(t *testing.T) {
	t.Run("builds a secure pull-always DaemonSet", func(t *testing.T) {
		g := NewWithT(t)
		warmer := &v1alpha1.ImageWarmer{
			ObjectMeta: metav1.ObjectMeta{Name: "runtime", Namespace: "agents"},
			Spec: v1alpha1.ImageWarmerSpec{
				Cron:  "0 * * * *",
				Image: "example.com/repository:v1",
			},
		}

		daemonSet, err := imageWarmerDaemonSet(warmer)
		g.Expect(err).NotTo(HaveOccurred())
		g.Expect(daemonSet.Spec.Template.Spec.Containers).To(HaveLen(1))

		container := daemonSet.Spec.Template.Spec.Containers[0]
		g.Expect(container.Name).To(Equal(imageWarmerContainerName))
		g.Expect(container.Image).To(Equal(warmer.Spec.Image))
		g.Expect(container.ImagePullPolicy).To(Equal(corev1.PullAlways))
		g.Expect(container.SecurityContext.AllowPrivilegeEscalation).To(HaveValue(BeFalse()))
		g.Expect(container.SecurityContext.ReadOnlyRootFilesystem).To(HaveValue(BeTrue()))
		g.Expect(container.SecurityContext.RunAsNonRoot).To(HaveValue(BeTrue()))
		g.Expect(container.SecurityContext.RunAsUser).To(HaveValue(Equal(int64(65532))))
		g.Expect(container.SecurityContext.RunAsGroup).To(HaveValue(Equal(int64(65532))))
		g.Expect(container.SecurityContext.Capabilities.Drop).To(ContainElement(corev1.Capability("ALL")))
		g.Expect(daemonSet.Spec.Template.Spec.AutomountServiceAccountToken).To(HaveValue(BeFalse()))
		g.Expect(daemonSet.Spec.Template.Spec.SecurityContext.RunAsNonRoot).To(HaveValue(BeTrue()))
		g.Expect(daemonSet.Spec.Template.Spec.SecurityContext.RunAsUser).To(HaveValue(Equal(int64(65532))))
		g.Expect(daemonSet.Spec.Template.Spec.SecurityContext.RunAsGroup).To(HaveValue(Equal(int64(65532))))
		g.Expect(daemonSet.Spec.Template.Spec.SecurityContext.FSGroup).To(HaveValue(Equal(int64(65532))))
		g.Expect(daemonSet.Spec.Template.Spec.SecurityContext.SeccompProfile.Type).To(Equal(corev1.SeccompProfileTypeRuntimeDefault))
	})

	t.Run("applies node selection and pod template overrides", func(t *testing.T) {
		g := NewWithT(t)
		runAsUser := int64(1234)
		warmer := &v1alpha1.ImageWarmer{
			ObjectMeta: metav1.ObjectMeta{Name: "runtime", Namespace: "agents"},
			Spec: v1alpha1.ImageWarmerSpec{
				Cron:  "*/15 * * * *",
				Image: "example.com/repository:v1",
				Selector: &metav1.LabelSelector{
					MatchLabels: map[string]string{"pool": "agents"},
					MatchExpressions: []metav1.LabelSelectorRequirement{{
						Key:      "arch",
						Operator: metav1.LabelSelectorOpIn,
						Values:   []string{"arm64"},
					}},
				},
				Template: &corev1.PodTemplateSpec{
					ObjectMeta: metav1.ObjectMeta{Annotations: map[string]string{"example.com/custom": "true"}},
					Spec: corev1.PodSpec{
						SecurityContext: &corev1.PodSecurityContext{RunAsUser: &runAsUser},
						Containers: []corev1.Container{{
							Name: imageWarmerContainerName,
							Resources: corev1.ResourceRequirements{
								Requests: corev1.ResourceList{corev1.ResourceCPU: resource.MustParse("100m")},
							},
						}},
					},
				},
			},
		}

		daemonSet, err := imageWarmerDaemonSet(warmer)
		g.Expect(err).NotTo(HaveOccurred())
		g.Expect(daemonSet.Spec.Template.Annotations).To(HaveKeyWithValue("example.com/custom", "true"))
		g.Expect(daemonSet.Spec.Template.Spec.SecurityContext.RunAsUser).To(HaveValue(Equal(runAsUser)))
		g.Expect(daemonSet.Spec.Template.Spec.Affinity.NodeAffinity.RequiredDuringSchedulingIgnoredDuringExecution.NodeSelectorTerms[0].MatchExpressions).To(
			ConsistOf(
				corev1.NodeSelectorRequirement{Key: "pool", Operator: corev1.NodeSelectorOpIn, Values: []string{"agents"}},
				corev1.NodeSelectorRequirement{Key: "arch", Operator: corev1.NodeSelectorOpIn, Values: []string{"arm64"}},
			),
		)
		g.Expect(daemonSet.Spec.Template.Labels).To(HaveKeyWithValue(v1alpha1.ImageWarmerNameLabel, warmer.Name))
		g.Expect(daemonSet.Spec.Template.Spec.Containers[0].Image).To(Equal(warmer.Spec.Image))
	})
}
