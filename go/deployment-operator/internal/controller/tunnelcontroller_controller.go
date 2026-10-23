package controller

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

const (
	tunnelControllerContainerName  = "tunnel-controller"
	tunnelControllerSpecAnnotation = "deployments.plural.sh/tunnel-controller-spec-sha"
	tunnelTokenMountPath           = "/var/run/ferrotunnel"
	tunnelTLSMountPath             = "/var/run/ferrotunnel/tls"
	tunnelControllerRequeue        = 15 * time.Second
	tunnelControllerWaitingMessage = "waiting for the tunnel controller Deployment"
)

// FerroTunnelConfig is the deployment operator configuration for every TunnelController.
// The custom resource only supplies its name and image.
type FerroTunnelConfig struct {
	Server             string
	ServiceAccountName string
	Token              string
	CACert             string
	Cert               string
	Key                string
}

func (in FerroTunnelConfig) validate() error {
	missing := make([]string, 0)
	for _, field := range []struct {
		name  string
		value string
	}{
		{"server", in.Server},
		{"service account", in.ServiceAccountName},
		{"token", in.Token},
		{"ca certificate", in.CACert},
		{"client certificate", in.Cert},
		{"client key", in.Key},
	} {
		if field.value == "" {
			missing = append(missing, field.name)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("ferrotunnel operator configuration is missing %s", strings.Join(missing, ", "))
	}
	return nil
}

// TunnelControllerReconciler reconciles a TunnelController object by ensuring
// one FerroTunnel client Deployment.
type TunnelControllerReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	Config FerroTunnelConfig
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=tunnelcontrollers,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=tunnelcontrollers/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=tunnelcontrollers/finalizers,verbs=update
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=pods,verbs=get;list;watch

func (r *TunnelControllerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	tunnelController := &v1alpha1.TunnelController{}
	if err := r.Get(ctx, req.NamespacedName, tunnelController); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewDefaultScope(ctx, r.Client, tunnelController)
	if err != nil {
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	if !tunnelController.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	if err := r.Config.validate(); err != nil {
		return r.fail(tunnelController, err)
	}
	secret := operatorTunnelSecret(tunnelController, r.Config)
	if err := controllerutil.SetControllerReference(tunnelController, secret, r.Scheme); err != nil {
		return r.fail(tunnelController, fmt.Errorf("failed to set tunnel controller Secret owner: %w", err))
	}
	if err := r.ensureSecret(ctx, secret); err != nil {
		return r.fail(tunnelController, err)
	}

	desired, err := tunnelControllerDeployment(tunnelController, r.Config, secret)
	if err != nil {
		return r.fail(tunnelController, err)
	}
	if err := controllerutil.SetControllerReference(tunnelController, desired, r.Scheme); err != nil {
		return r.fail(tunnelController, fmt.Errorf("failed to set tunnel controller Deployment owner: %w", err))
	}

	existing := &appsv1.Deployment{}
	err = r.Get(ctx, client.ObjectKeyFromObject(desired), existing)
	if errors.IsNotFound(err) {
		if err := r.Create(ctx, desired); err != nil {
			return r.fail(tunnelController, fmt.Errorf("failed to create tunnel controller Deployment: %w", err))
		}
		utils.MarkCondition(tunnelController.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, tunnelControllerWaitingMessage)
		return ctrl.Result{RequeueAfter: tunnelControllerRequeue}, nil
	}
	if err != nil {
		return r.fail(tunnelController, fmt.Errorf("failed to get tunnel controller Deployment: %w", err))
	}
	if !metav1.IsControlledBy(existing, tunnelController) {
		return r.fail(tunnelController, fmt.Errorf("deployment %s/%s is not controlled by TunnelController", existing.Namespace, existing.Name))
	}

	if existing.Annotations[tunnelControllerSpecAnnotation] != desired.Annotations[tunnelControllerSpecAnnotation] {
		existing.Annotations = desired.Annotations
		existing.Labels = desired.Labels
		existing.Spec = desired.Spec
		if err := r.Update(ctx, existing); err != nil {
			return r.fail(tunnelController, fmt.Errorf("failed to update tunnel controller Deployment: %w", err))
		}
	}

	health, err := r.tunnelControllerHealth(ctx, existing)
	if err != nil {
		return r.fail(tunnelController, err)
	}
	switch health.Status {
	case common.HealthStatusHealthy:
		utils.MarkCondition(tunnelController.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
		return ctrl.Result{}, nil
	case common.HealthStatusDegraded:
		utils.MarkCondition(tunnelController.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReasonError, health.Message)
		return ctrl.Result{RequeueAfter: tunnelControllerRequeue}, nil
	default:
		message := health.Message
		if message == "" {
			message = tunnelControllerWaitingMessage
		}
		utils.MarkCondition(tunnelController.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, message)
		return ctrl.Result{RequeueAfter: tunnelControllerRequeue}, nil
	}
}

func (r *TunnelControllerReconciler) fail(tunnelController *v1alpha1.TunnelController, err error) (ctrl.Result, error) {
	utils.MarkCondition(tunnelController.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReasonError, err.Error())
	return ctrl.Result{}, err
}

func (r *TunnelControllerReconciler) tunnelControllerHealth(ctx context.Context, deployment *appsv1.Deployment) (*common.HealthStatus, error) {
	health, err := resourceHealth(deployment)
	if err != nil || health.Status == common.HealthStatusDegraded {
		return health, err
	}

	pods := &corev1.PodList{}
	if err := r.List(ctx, pods, client.InNamespace(deployment.Namespace), client.MatchingLabels(deployment.Spec.Selector.MatchLabels)); err != nil {
		return nil, fmt.Errorf("failed to list tunnel controller Pods: %w", err)
	}
	for i := range pods.Items {
		podHealth, err := resourceHealth(&pods.Items[i])
		if err != nil {
			return nil, err
		}
		if podHealth.Status == common.HealthStatusDegraded {
			return podHealth, nil
		}
	}
	return health, nil
}

func resourceHealth(obj client.Object) (*common.HealthStatus, error) {
	switch obj.(type) {
	case *appsv1.Deployment:
		obj.GetObjectKind().SetGroupVersionKind(appsv1.SchemeGroupVersion.WithKind("Deployment"))
	case *corev1.Pod:
		obj.GetObjectKind().SetGroupVersionKind(corev1.SchemeGroupVersion.WithKind("Pod"))
	}
	unstructuredObj, err := common.ToUnstructured(obj)
	if err != nil {
		return nil, fmt.Errorf("failed to convert %s to unstructured: %w", obj.GetObjectKind().GroupVersionKind().Kind, err)
	}
	health, err := common.GetResourceHealth(unstructuredObj)
	if err != nil {
		return nil, err
	}
	if health == nil {
		return &common.HealthStatus{Status: common.HealthStatusUnknown}, nil
	}
	return health, nil
}

func (r *TunnelControllerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.TunnelController{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&appsv1.Deployment{}).
		Owns(&corev1.Secret{}).
		Complete(r)
}

func tunnelControllerDeployment(tunnelController *v1alpha1.TunnelController, config FerroTunnelConfig, secret *corev1.Secret) (*appsv1.Deployment, error) {
	args := []string{
		"--server", config.Server,
		"--token-file", tunnelTokenMountPath + "/token",
		"--tls-ca", tunnelTLSMountPath + "/ca.crt",
		"--tls-cert", tunnelTLSMountPath + "/tls.crt",
		"--tls-key", tunnelTLSMountPath + "/tls.key",
	}
	sha, err := utils.HashObject(struct {
		Spec   v1alpha1.TunnelControllerSpec `json:"spec"`
		Server string                        `json:"server"`
		Args   []string                      `json:"args"`
		Secret map[string][]byte             `json:"secret"`
	}{Spec: tunnelController.Spec, Server: config.Server, Args: args, Secret: secret.Data})
	if err != nil {
		return nil, fmt.Errorf("failed to hash TunnelController spec: %w", err)
	}

	labels := map[string]string{
		v1alpha1.TunnelControllerNameLabel: tunnelController.Name,
		"app.kubernetes.io/component":      "tunnel-controller",
	}
	volumeMounts := []corev1.VolumeMount{
		{Name: "token", MountPath: tunnelTokenMountPath, ReadOnly: true},
		{Name: "tls", MountPath: tunnelTLSMountPath, ReadOnly: true},
	}
	volumes := []corev1.Volume{
		{
			Name: "token",
			VolumeSource: corev1.VolumeSource{
				Secret: &corev1.SecretVolumeSource{
					SecretName: secret.Name,
					Items:      []corev1.KeyToPath{{Key: "token", Path: "token"}},
				},
			},
		},
		{
			Name: "tls",
			VolumeSource: corev1.VolumeSource{
				Secret: &corev1.SecretVolumeSource{
					SecretName: secret.Name,
					Items: []corev1.KeyToPath{
						{Key: "ca.crt", Path: "ca.crt"},
						{Key: "tls.crt", Path: "tls.crt"},
						{Key: "tls.key", Path: "tls.key"},
					},
				},
			},
		},
	}

	runAsNonRoot := true
	runAsUser := int64(65532)
	runAsGroup := int64(65532)
	fsGroup := int64(65532)
	allowPrivilegeEscalation := false
	readOnlyRootFilesystem := true
	defaultTemplate := corev1.PodTemplateSpec{
		ObjectMeta: metav1.ObjectMeta{Labels: labels},
		Spec: corev1.PodSpec{
			ServiceAccountName: config.ServiceAccountName,
			SecurityContext: &corev1.PodSecurityContext{
				RunAsNonRoot: &runAsNonRoot,
				RunAsUser:    &runAsUser,
				RunAsGroup:   &runAsGroup,
				FSGroup:      &fsGroup,
				SeccompProfile: &corev1.SeccompProfile{
					Type: corev1.SeccompProfileTypeRuntimeDefault,
				},
			},
			Containers: []corev1.Container{{
				Name:            tunnelControllerContainerName,
				Image:           v1alpha1.DefaultTunnelControllerImage,
				ImagePullPolicy: corev1.PullIfNotPresent,
				Args:            args,
				VolumeMounts:    volumeMounts,
				SecurityContext: &corev1.SecurityContext{
					AllowPrivilegeEscalation: &allowPrivilegeEscalation,
					ReadOnlyRootFilesystem:   &readOnlyRootFilesystem,
					RunAsNonRoot:             &runAsNonRoot,
					RunAsUser:                &runAsUser,
					RunAsGroup:               &runAsGroup,
					Capabilities: &corev1.Capabilities{
						Drop: []corev1.Capability{"ALL"},
					},
				},
			}},
			Volumes: volumes,
		},
	}

	template, err := mergePodTemplate(defaultTemplate, tunnelController.Spec.Template)
	if err != nil {
		return nil, err
	}
	if template.Labels == nil {
		template.Labels = map[string]string{}
	}
	template.Labels[v1alpha1.TunnelControllerNameLabel] = tunnelController.Name
	template.Labels["app.kubernetes.io/component"] = "tunnel-controller"
	applyTunnelControllerContainer(&template.Spec, args, volumeMounts, volumes, config.ServiceAccountName)

	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      tunnelController.Name,
			Namespace: tunnelController.Namespace,
			Labels:    labels,
			Annotations: map[string]string{
				tunnelControllerSpecAnnotation: sha,
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: int32Ptr(1),
			Selector: &metav1.LabelSelector{MatchLabels: labels},
			Template: template,
		},
	}, nil
}

func applyTunnelControllerContainer(spec *corev1.PodSpec, args []string, volumeMounts []corev1.VolumeMount, volumes []corev1.Volume, serviceAccountName string) {
	if spec.ServiceAccountName == "" {
		spec.ServiceAccountName = serviceAccountName
	}
	spec.Volumes = ensureNamedVolumes(spec.Volumes, volumes)

	index := -1
	for i := range spec.Containers {
		if spec.Containers[i].Name == tunnelControllerContainerName {
			index = i
			break
		}
	}
	if index == -1 {
		spec.Containers = append(spec.Containers, corev1.Container{Name: tunnelControllerContainerName})
		index = len(spec.Containers) - 1
	}

	container := &spec.Containers[index]
	if container.Image == "" {
		container.Image = v1alpha1.DefaultTunnelControllerImage
	}
	container.Args = args
	if container.ImagePullPolicy == "" {
		container.ImagePullPolicy = corev1.PullIfNotPresent
	}
	container.VolumeMounts = ensureNamedVolumeMounts(container.VolumeMounts, volumeMounts)
	container.SecurityContext = ensureTunnelControllerContainerSecurityContext(container.SecurityContext)
	spec.SecurityContext = ensureTunnelControllerPodSecurityContext(spec.SecurityContext)
}

func ensureNamedVolumes(existing, required []corev1.Volume) []corev1.Volume {
	for _, want := range required {
		found := false
		for i := range existing {
			if existing[i].Name == want.Name {
				existing[i] = want
				found = true
				break
			}
		}
		if !found {
			existing = append(existing, want)
		}
	}
	return existing
}

func ensureNamedVolumeMounts(existing, required []corev1.VolumeMount) []corev1.VolumeMount {
	for _, want := range required {
		found := false
		for i := range existing {
			if existing[i].Name == want.Name {
				existing[i] = want
				found = true
				break
			}
		}
		if !found {
			existing = append(existing, want)
		}
	}
	return existing
}

func ensureTunnelControllerPodSecurityContext(psc *corev1.PodSecurityContext) *corev1.PodSecurityContext {
	if psc != nil {
		return psc
	}
	runAsNonRoot := true
	runAsUser := int64(65532)
	runAsGroup := int64(65532)
	fsGroup := int64(65532)
	return &corev1.PodSecurityContext{
		RunAsNonRoot: &runAsNonRoot,
		RunAsUser:    &runAsUser,
		RunAsGroup:   &runAsGroup,
		FSGroup:      &fsGroup,
		SeccompProfile: &corev1.SeccompProfile{
			Type: corev1.SeccompProfileTypeRuntimeDefault,
		},
	}
}

func ensureTunnelControllerContainerSecurityContext(sc *corev1.SecurityContext) *corev1.SecurityContext {
	if sc != nil {
		return sc
	}
	runAsNonRoot := true
	runAsUser := int64(65532)
	runAsGroup := int64(65532)
	allowPrivilegeEscalation := false
	readOnlyRootFilesystem := true
	return &corev1.SecurityContext{
		AllowPrivilegeEscalation: &allowPrivilegeEscalation,
		ReadOnlyRootFilesystem:   &readOnlyRootFilesystem,
		RunAsNonRoot:             &runAsNonRoot,
		RunAsUser:                &runAsUser,
		RunAsGroup:               &runAsGroup,
		Capabilities: &corev1.Capabilities{
			Drop: []corev1.Capability{"ALL"},
		},
	}
}

func operatorTunnelSecretName(tunnelController *v1alpha1.TunnelController) string {
	return tunnelController.Name + "-ferrotunnel"
}

func operatorTunnelSecret(tunnelController *v1alpha1.TunnelController, config FerroTunnelConfig) *corev1.Secret {
	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      operatorTunnelSecretName(tunnelController),
			Namespace: tunnelController.Namespace,
		},
		Data: map[string][]byte{
			"token":   []byte(config.Token),
			"ca.crt":  []byte(config.CACert),
			"tls.crt": []byte(config.Cert),
			"tls.key": []byte(config.Key),
		},
	}
}

func (r *TunnelControllerReconciler) ensureSecret(ctx context.Context, desired *corev1.Secret) error {
	existing := &corev1.Secret{}
	err := r.Get(ctx, client.ObjectKeyFromObject(desired), existing)
	if errors.IsNotFound(err) {
		if err := r.Create(ctx, desired); err != nil {
			return fmt.Errorf("failed to create tunnel controller Secret: %w", err)
		}
		return nil
	}
	if err != nil {
		return fmt.Errorf("failed to get tunnel controller Secret: %w", err)
	}
	if secretDataEqual(existing.Data, desired.Data) {
		return nil
	}
	existing.Data = desired.Data
	if err := r.Update(ctx, existing); err != nil {
		return fmt.Errorf("failed to update tunnel controller Secret: %w", err)
	}
	return nil
}

func secretDataEqual(left, right map[string][]byte) bool {
	if len(left) != len(right) {
		return false
	}
	for key, value := range right {
		if !bytes.Equal(left[key], value) {
			return false
		}
	}
	return true
}

func int32Ptr(value int32) *int32 {
	return &value
}
