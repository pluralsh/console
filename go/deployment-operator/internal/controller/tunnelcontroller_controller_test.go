package controller

import (
	"context"
	"testing"

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

func tunnelControllerConfig() FerroTunnelConfig {
	return FerroTunnelConfig{
		Server:             "console.example.com:7835",
		ServiceAccountName: "deployment-operator",
		Token:              "tunnel-secret",
		CACert:             "ca",
		Cert:               "client-cert",
		Key:                "client-key",
	}
}

func TestTunnelControllerReconcileCreatesSecretAndDeployment(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(v1alpha1.AddToScheme(scheme)).To(Succeed())
	g.Expect(appsv1.AddToScheme(scheme)).To(Succeed())
	g.Expect(corev1.AddToScheme(scheme)).To(Succeed())

	tunnelController := &v1alpha1.TunnelController{
		ObjectMeta: metav1.ObjectMeta{Name: "ferrotunnel", Namespace: "plrl-deploy-operator"},
		Spec: v1alpha1.TunnelControllerSpec{
			Template: &corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{{
						Name:  tunnelControllerContainerName,
						Image: "ghcr.io/pluralsh/ferrotunnel-client:master",
					}},
				},
			},
		},
	}
	k8sClient := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&v1alpha1.TunnelController{}).
		WithObjects(tunnelController).
		Build()
	reconciler := &TunnelControllerReconciler{
		Client: k8sClient,
		Scheme: scheme,
		Config: tunnelControllerConfig(),
	}
	request := ctrl.Request{NamespacedName: types.NamespacedName{Name: tunnelController.Name, Namespace: tunnelController.Namespace}}

	_, err := reconciler.Reconcile(context.Background(), request)
	g.Expect(err).NotTo(HaveOccurred())

	secret := &corev1.Secret{}
	g.Expect(k8sClient.Get(context.Background(), types.NamespacedName{Name: "ferrotunnel-ferrotunnel", Namespace: tunnelController.Namespace}, secret)).To(Succeed())
	g.Expect(string(secret.Data["token"])).To(Equal("tunnel-secret"))
	g.Expect(metav1.IsControlledBy(secret, tunnelController)).To(BeTrue())

	deployment := &appsv1.Deployment{}
	g.Expect(k8sClient.Get(context.Background(), request.NamespacedName, deployment)).To(Succeed())
	g.Expect(*deployment.Spec.Replicas).To(Equal(int32(1)))
	g.Expect(deployment.Spec.Template.Spec.ServiceAccountName).To(Equal("deployment-operator"))
	g.Expect(deployment.Spec.Template.Spec.SecurityContext.RunAsNonRoot).To(HaveValue(BeTrue()))
	g.Expect(deployment.Spec.Template.Spec.SecurityContext.RunAsUser).To(HaveValue(Equal(int64(65532))))
	g.Expect(deployment.Spec.Template.Spec.SecurityContext.RunAsGroup).To(HaveValue(Equal(int64(65532))))
	g.Expect(deployment.Spec.Template.Spec.SecurityContext.FSGroup).To(HaveValue(Equal(int64(65532))))
	g.Expect(deployment.Spec.Template.Spec.SecurityContext.SeccompProfile.Type).To(Equal(corev1.SeccompProfileTypeRuntimeDefault))
	container := deployment.Spec.Template.Spec.Containers[0]
	g.Expect(container.Image).To(Equal("ghcr.io/pluralsh/ferrotunnel-client:master"))
	g.Expect(container.SecurityContext.AllowPrivilegeEscalation).To(HaveValue(BeFalse()))
	g.Expect(container.SecurityContext.ReadOnlyRootFilesystem).To(HaveValue(BeTrue()))
	g.Expect(container.SecurityContext.RunAsNonRoot).To(HaveValue(BeTrue()))
	g.Expect(container.SecurityContext.RunAsUser).To(HaveValue(Equal(int64(65532))))
	g.Expect(container.SecurityContext.Capabilities.Drop).To(ContainElement(corev1.Capability("ALL")))
	g.Expect(container.Args).To(Equal([]string{
		"--server", "console.example.com:7835",
		"--token-file", "/var/run/ferrotunnel/token",
		"--tls-ca", "/var/run/ferrotunnel/tls/ca.crt",
		"--tls-cert", "/var/run/ferrotunnel/tls/tls.crt",
		"--tls-key", "/var/run/ferrotunnel/tls/tls.key",
	}))
}

func TestTunnelControllerReconcileAppliesPodTemplate(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(v1alpha1.AddToScheme(scheme)).To(Succeed())
	g.Expect(appsv1.AddToScheme(scheme)).To(Succeed())
	g.Expect(corev1.AddToScheme(scheme)).To(Succeed())

	runAsUser := int64(1234)
	tunnelController := &v1alpha1.TunnelController{
		ObjectMeta: metav1.ObjectMeta{Name: "ferrotunnel", Namespace: "plrl-deploy-operator"},
		Spec: v1alpha1.TunnelControllerSpec{
			Template: &corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Annotations: map[string]string{"example.com/custom": "true"}},
				Spec: corev1.PodSpec{
					NodeSelector:    map[string]string{"pool": "tunnels"},
					Tolerations:     []corev1.Toleration{{Key: "dedicated", Operator: corev1.TolerationOpExists}},
					SecurityContext: &corev1.PodSecurityContext{RunAsUser: &runAsUser},
					Containers: []corev1.Container{{
						Name:  tunnelControllerContainerName,
						Image: "ghcr.io/pluralsh/ferrotunnel-client:v1.2.3",
						Resources: corev1.ResourceRequirements{
							Requests: corev1.ResourceList{corev1.ResourceCPU: resource.MustParse("100m")},
						},
					}},
				},
			},
		},
	}
	k8sClient := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&v1alpha1.TunnelController{}).
		WithObjects(tunnelController).
		Build()
	reconciler := &TunnelControllerReconciler{
		Client: k8sClient,
		Scheme: scheme,
		Config: tunnelControllerConfig(),
	}

	_, err := reconciler.Reconcile(context.Background(), ctrl.Request{
		NamespacedName: types.NamespacedName{Name: tunnelController.Name, Namespace: tunnelController.Namespace},
	})
	g.Expect(err).NotTo(HaveOccurred())

	deployment := &appsv1.Deployment{}
	g.Expect(k8sClient.Get(context.Background(), types.NamespacedName{Name: tunnelController.Name, Namespace: tunnelController.Namespace}, deployment)).To(Succeed())
	g.Expect(deployment.Spec.Template.Annotations).To(HaveKeyWithValue("example.com/custom", "true"))
	g.Expect(deployment.Spec.Template.Spec.NodeSelector).To(HaveKeyWithValue("pool", "tunnels"))
	g.Expect(deployment.Spec.Template.Spec.Tolerations).To(ContainElement(corev1.Toleration{Key: "dedicated", Operator: corev1.TolerationOpExists}))
	g.Expect(deployment.Spec.Template.Spec.SecurityContext.RunAsUser).To(HaveValue(Equal(runAsUser)))
	g.Expect(deployment.Spec.Template.Spec.Containers[0].Image).To(Equal("ghcr.io/pluralsh/ferrotunnel-client:v1.2.3"))
	g.Expect(deployment.Spec.Template.Spec.Containers[0].Resources.Requests.Cpu().String()).To(Equal("100m"))
	g.Expect(deployment.Spec.Template.Spec.Containers[0].Args).To(ContainElement("--server"))
}

func TestTunnelControllerReconcileDefaultsImage(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(v1alpha1.AddToScheme(scheme)).To(Succeed())
	g.Expect(appsv1.AddToScheme(scheme)).To(Succeed())
	g.Expect(corev1.AddToScheme(scheme)).To(Succeed())

	tunnelController := &v1alpha1.TunnelController{
		ObjectMeta: metav1.ObjectMeta{Name: "ferrotunnel", Namespace: "plrl-deploy-operator"},
	}
	k8sClient := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&v1alpha1.TunnelController{}).
		WithObjects(tunnelController).
		Build()
	reconciler := &TunnelControllerReconciler{
		Client: k8sClient,
		Scheme: scheme,
		Config: tunnelControllerConfig(),
	}

	_, err := reconciler.Reconcile(context.Background(), ctrl.Request{
		NamespacedName: types.NamespacedName{Name: tunnelController.Name, Namespace: tunnelController.Namespace},
	})
	g.Expect(err).NotTo(HaveOccurred())

	deployment := &appsv1.Deployment{}
	g.Expect(k8sClient.Get(context.Background(), types.NamespacedName{Name: tunnelController.Name, Namespace: tunnelController.Namespace}, deployment)).To(Succeed())
	g.Expect(deployment.Spec.Template.Spec.Containers[0].Image).To(Equal(v1alpha1.DefaultTunnelControllerImage))
}

func TestTunnelControllerReconcileRecordsPodError(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(v1alpha1.AddToScheme(scheme)).To(Succeed())
	g.Expect(appsv1.AddToScheme(scheme)).To(Succeed())
	g.Expect(corev1.AddToScheme(scheme)).To(Succeed())

	tunnelController := &v1alpha1.TunnelController{
		ObjectMeta: metav1.ObjectMeta{Name: "ferrotunnel", Namespace: "plrl-deploy-operator"},
	}
	k8sClient := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&v1alpha1.TunnelController{}).
		WithObjects(tunnelController).
		Build()
	reconciler := &TunnelControllerReconciler{
		Client: k8sClient,
		Scheme: scheme,
		Config: tunnelControllerConfig(),
	}
	request := ctrl.Request{NamespacedName: types.NamespacedName{Name: tunnelController.Name, Namespace: tunnelController.Namespace}}
	_, err := reconciler.Reconcile(context.Background(), request)
	g.Expect(err).NotTo(HaveOccurred())

	deployment := &appsv1.Deployment{}
	g.Expect(k8sClient.Get(context.Background(), request.NamespacedName, deployment)).To(Succeed())
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ferrotunnel-pod",
			Namespace: tunnelController.Namespace,
			Labels:    deployment.Spec.Selector.MatchLabels,
		},
		Spec: corev1.PodSpec{RestartPolicy: corev1.RestartPolicyAlways},
		Status: corev1.PodStatus{
			Phase: corev1.PodRunning,
			ContainerStatuses: []corev1.ContainerStatus{{
				Name: tunnelControllerContainerName,
				State: corev1.ContainerState{Waiting: &corev1.ContainerStateWaiting{
					Reason:  "CrashLoopBackOff",
					Message: "back-off restarting failed container",
				}},
			}},
		},
	}
	g.Expect(k8sClient.Create(context.Background(), pod)).To(Succeed())

	_, err = reconciler.Reconcile(context.Background(), request)
	g.Expect(err).NotTo(HaveOccurred())

	updated := &v1alpha1.TunnelController{}
	g.Expect(k8sClient.Get(context.Background(), request.NamespacedName, updated)).To(Succeed())
	condition := updated.Status.Conditions[0]
	g.Expect(condition.Type).To(Equal(v1alpha1.ReadyConditionType.String()))
	g.Expect(condition.Status).To(Equal(metav1.ConditionFalse))
	g.Expect(condition.Reason).To(Equal(v1alpha1.ReadyConditionReasonError.String()))
	g.Expect(condition.Message).To(Equal("back-off restarting failed container"))
}

func TestTunnelControllerReconcileRecordsConfigError(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(v1alpha1.AddToScheme(scheme)).To(Succeed())
	g.Expect(appsv1.AddToScheme(scheme)).To(Succeed())

	tunnelController := &v1alpha1.TunnelController{
		ObjectMeta: metav1.ObjectMeta{Name: "ferrotunnel", Namespace: "plrl-deploy-operator"},
	}
	k8sClient := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&v1alpha1.TunnelController{}).
		WithObjects(tunnelController).
		Build()
	reconciler := &TunnelControllerReconciler{Client: k8sClient, Scheme: scheme}

	request := ctrl.Request{NamespacedName: types.NamespacedName{Name: tunnelController.Name, Namespace: tunnelController.Namespace}}
	_, err := reconciler.Reconcile(context.Background(), request)
	g.Expect(err).To(HaveOccurred())

	updated := &v1alpha1.TunnelController{}
	g.Expect(k8sClient.Get(context.Background(), request.NamespacedName, updated)).To(Succeed())
	condition := updated.Status.Conditions[0]
	g.Expect(condition.Status).To(Equal(metav1.ConditionFalse))
	g.Expect(condition.Reason).To(Equal(v1alpha1.ReadyConditionReasonError.String()))
	g.Expect(condition.Message).To(ContainSubstring("ferrotunnel operator configuration is missing"))
}

func TestTunnelControllerReconcileIgnoresDeletion(t *testing.T) {
	g := NewWithT(t)
	scheme := runtime.NewScheme()
	g.Expect(v1alpha1.AddToScheme(scheme)).To(Succeed())
	g.Expect(appsv1.AddToScheme(scheme)).To(Succeed())

	now := metav1.Now()
	tunnelController := &v1alpha1.TunnelController{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "ferrotunnel",
			Namespace:         "plrl-deploy-operator",
			DeletionTimestamp: &now,
			Finalizers:        []string{"test"},
		},
	}
	k8sClient := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&v1alpha1.TunnelController{}).
		WithObjects(tunnelController).
		Build()
	reconciler := &TunnelControllerReconciler{Client: k8sClient, Scheme: scheme}

	_, err := reconciler.Reconcile(context.Background(), ctrl.Request{
		NamespacedName: types.NamespacedName{Name: tunnelController.Name, Namespace: tunnelController.Namespace},
	})
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(k8sClient.Get(context.Background(), types.NamespacedName{Name: tunnelController.Name, Namespace: tunnelController.Namespace}, &appsv1.Deployment{})).NotTo(Succeed())
}
